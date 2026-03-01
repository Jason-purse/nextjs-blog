// ============================================================
// Content Transformer Pipeline System
// 核心设计：Input → [Transformers] → Output
// ============================================================

/** 转换器输入：原始 MDX + Frontmatter */
export interface TransformerInput {
  content: string                    // MDX 原文
  frontmatter: Record<string, any>   // Frontmatter 对象
  slug: string                       // 文章 slug
  locale?: string                    // 语言
}

/** 转换器输出：增强后的内容 + 元数据 */
export interface TransformerOutput {
  content: string
  metadata: TransformerMetadata
}

export interface TransformerMetadata {
  // 基础元数据
  toc?: TOCItem[]
  wordCount?: number
  readTimeMinutes?: number
  characterCount?: number
  
  // 内容分析
  codeBlocks?: CodeBlock[]
  images?: ImageInfo[]
  links?: LinkInfo[]
  
  // SEO
  excerpt?: string
  keywords?: string[]
  
  // 自定义
  [key: string]: any
}

export interface TOCItem {
  id: string
  text: string
  level: number
}

export interface CodeBlock {
  language?: string
  code: string
  lineCount: number
}

export interface ImageInfo {
  src: string
  alt?: string
  title?: string
}

export interface LinkInfo {
  href: string
  text: string
  isInternal: boolean
}

/** 转换器执行阶段 */
export type TransformerPhase = 'early' | 'middle' | 'late' | 'render'

/** 转换器接口 */
export interface ContentTransformer {
  /** 唯一标识 */
  id: string
  
  /** 执行阶段 */
  phase: TransformerPhase
  
  /** 同阶段内优先级（越小越先执行） */
  priority: number
  
  /** 启用状态 */
  enabled?: boolean
  
  /**
   * 同步转换 - 处理内容本身
   * 返回增强后的输入（可修改 content 或 frontmatter）
   */
  transform?(input: TransformerInput): TransformerInput | Promise<TransformerInput>
  
  /**
   * 异步转换 - 适合 API 调用、AI 处理等耗时操作
   * 返回增强后的输入
   */
  transformAsync?(input: TransformerInput): Promise<TransformerInput>
  
  /**
   * 渲染阶段注入 - 返回要注入到 HTML 的字符串
   * 可以是 <script>、<meta>、<style> 等
   */
  render?(ctx: RenderContext): string | Promise<string>
  
  /**
   * 元数据提取 - 从输入中提取特定元数据
   * 专门给 phase: 'early' 使用
   */
  extract?(input: TransformerInput): Partial<TransformerMetadata> | Promise<Partial<TransformerMetadata>>
}

/** 渲染阶段上下文 */
export interface RenderContext {
  slug: string
  title: string
  description?: string
  tags?: string[]
  author?: string
  publishedAt?: string
  modifiedAt?: string
  metadata: TransformerMetadata
  frontmatter: Record<string, any>
  html: string                      // 已渲染的 HTML（供进一步处理）
}

/** Transformer 注册表 */
export interface TransformerRegistry {
  [id: string]: ContentTransformer
}

/** 内置转换器 - 平台必需 */
export const BUILTIN_TRANSFORMERS: ContentTransformer[] = [
  // === Early Phase - 元数据提取 ===
  {
    id: 'builtin:toc-extractor',
    phase: 'early',
    priority: 10,
    extract(input): Partial<TransformerMetadata> {
      const toc: TOCItem[] = []
      const regex = /^(#{2,3})\s+(.+)$/gm
      let match
      let idx = 0
      while ((match = regex.exec(input.content)) !== null) {
        const level = match[1].length
        const text = match[2].trim()
        const id = text.toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
          .replace(/(^-|-$)/g, '') + '-' + idx++
        toc.push({ id, text, level })
      }
      return { toc }
    }
  },
  {
    id: 'builtin:word-count',
    phase: 'early',
    priority: 20,
    extract(input): Partial<TransformerMetadata> {
      const cn = (input.content.match(/[\u4e00-\u9fa5]/g) || []).length
      const en = input.content
        .replace(/[\u4e00-\u9fa5]/g, '')
        .match(/[a-zA-Z0-9]+/g)?.length || 0
      const wordCount = cn + en
      const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 250))
      return { wordCount, readTimeMinutes }
    }
  },
  {
    id: 'builtin:code-blocks',
    phase: 'early',
    priority: 30,
    extract(input): Partial<TransformerMetadata> {
      const codeBlocks: CodeBlock[] = []
      const regex = /```(\w*)\n([\s\S]*?)```/g
      let match
      while ((match = regex.exec(input.content)) !== null) {
        codeBlocks.push({
          language: match[1] || 'text',
          code: match[2].trim(),
          lineCount: match[2].split('\n').length
        })
      }
      return { codeBlocks }
    }
  },
  {
    id: 'builtin:images',
    phase: 'early',
    priority: 40,
    extract(input): Partial<TransformerMetadata> {
      const images: ImageInfo[] = []
      const regex = /!\[([^\]]*)\]\(([^)]+)\)/g
      let match
      while ((match = regex.exec(input.content)) !== null) {
        images.push({
          src: match[2],
          alt: match[1] || undefined
        })
      }
      return { images }
    }
  },
  
  // === Middle Phase - 内容处理 ===
  {
    id: 'builtin:heading-ids',
    phase: 'middle',
    priority: 10,
    transform(input): TransformerInput {
      let idx = 0
      const processed = input.content
        .replace(/^### (.+)$/gm, (_, text) => {
          const id = text.toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
            .replace(/(^-|-$)/g, '') + '-' + idx++
          return `### ${text} {#${id}}`
        })
        .replace(/^## (.+)$/gm, (_, text) => {
          const id = text.toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
            .replace(/(^-|-$)/g, '') + '-' + idx++
          return `## ${text} {#${id}}`
        })
        .replace(/^# (.+)$/gm, (_, text) => {
          const id = text.toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
            .replace(/(^-|-$)/g, '') + '-' + idx++
          return `# ${text} {#${id}}`
        })
      return { ...input, content: processed }
    }
  },
  
  // === Late Phase - 增强处理 ===
  {
    id: 'builtin:excerpt',
    phase: 'late',
    priority: 10,
    transform(input): TransformerInput {
      // 移除代码块后提取摘要
      const plain = input.content
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]+`/g, '')
        .replace(/[#*_~\[\]]/g, '')
        .trim()
      const excerpt = plain.slice(0, 160).trim() + (plain.length > 160 ? '...' : '')
      return { 
        ...input, 
        frontmatter: { ...input.frontmatter, excerpt }
      }
    }
  },
  
  // === Render Phase - HTML 注入 ===
  {
    id: 'builtin:seo-meta',
    phase: 'render',
    priority: 10,
    render(ctx): string {
      const { title, description, tags, publishedAt, slug } = ctx
      const url = `https://yoursite.com/blog/${slug}`
      return `
<meta name="description" content="${description || ''}" />
<meta name="keywords" content="${(tags || []).join(', ')}" />
<link rel="canonical" href="${url}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description || ''}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${url}" />
${publishedAt ? `<meta property="article:published_time" content="${publishedAt}" />` : ''}
      `.trim()
    }
  }
]

/** 平台元数据 key 常量 */
export const METADATA_KEYS = {
  TOC: 'toc',
  WORD_COUNT: 'wordCount',
  READ_TIME: 'readTimeMinutes',
  CODE_BLOCKS: 'codeBlocks',
  IMAGES: 'images',
  EXCERPT: 'excerpt',
  KEYWORDS: 'keywords',
} as const
