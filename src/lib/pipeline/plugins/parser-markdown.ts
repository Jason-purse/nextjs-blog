// ============================================================
// Parser Plugin: Markdown/MDX Parser (简化版)
// ============================================================

import matter from 'gray-matter'
import type { RawContent, ParserPlugin, TransformerPlugin, ContentNode, PluginContext, Frontmatter } from '@/types/pipeline'
import type { Root } from 'mdast'

export class MarkdownParser implements ParserPlugin {
  name = 'markdown-parser'
  type = 'parser' as const
  accept = ['text/markdown', 'text/mdx', 'text/x-markdown']

  async parse(raw: RawContent, context: PluginContext): Promise<ContentNode> {
    // 解析 frontmatter
    const { data: frontmatter, content: body } = matter(raw.body)

    // 生成 AST (简化版，实际可用 remark-parse)
    const ast: Root = {
      type: 'root',
      children: this.parseMarkdownToAst(body)
    }

    // 提取基本信息
    const slug = this.generateSlug(raw.id, frontmatter)
    const title = frontmatter.title || this.extractTitle(body) || raw.id

    return {
      id: raw.id,
      slug,
      path: `/blog/${slug}`,
      source: raw.sourcePlugin,
      rawContent: raw.body,
      mimeType: raw.mimeType,
      ast,
      frontmatter: frontmatter as Frontmatter,
      body,
      createdAt: new Date(frontmatter.date || raw.meta.modifiedAt as string || new Date().toISOString()),
      updatedAt: new Date(raw.meta.modifiedAt as string || new Date().toISOString()),
      _errors: [],
      _meta: {}
    }
  }

  private parseMarkdownToAst(content: string): any[] {
    const lines = content.split('\n')
    const children: any[] = []
    let currentParagraph: string[] = []

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        children.push({
          type: 'paragraph',
          children: [{ type: 'text', value: currentParagraph.join('\n') }]
        })
        currentParagraph = []
      }
    }

    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('# ')) {
        flushParagraph()
        children.push({ type: 'heading', depth: 1, children: [{ type: 'text', value: trimmed.slice(2) }] })
      } else if (trimmed.startsWith('## ')) {
        flushParagraph()
        children.push({ type: 'heading', depth: 2, children: [{ type: 'text', value: trimmed.slice(3) }] })
      } else if (trimmed.startsWith('### ')) {
        flushParagraph()
        children.push({ type: 'heading', depth: 3, children: [{ type: 'text', value: trimmed.slice(4) }] })
      } else if (trimmed === '') {
        flushParagraph()
      } else {
        currentParagraph.push(line)
      }
    }

    flushParagraph()
    return children
  }

  private generateSlug(id: string, frontmatter: Record<string, unknown>): string {
    if (frontmatter.slug) {
      return frontmatter.slug as string
    }
    return id
  }

  private extractTitle(body: string): string | null {
    const match = body.match(/^#\s+(.+)$/m)
    return match ? match[1].trim() : null
  }
}

// ============================================================
// Built-in Transformers
// ============================================================

// TOC Generator
export class TocTransformer implements TransformerPlugin {
  name = 'toc-generator'
  type = 'transformer' as const
  priority = 40

  async transform(node: ContentNode): Promise<ContentNode> {
    if (!node.ast) return node

    const toc: ContentNode['toc'] = []
    
    const visit = (n: any) => {
      if (n.type === 'heading') {
        const text = extractText(n)
        const id = slugify(text)
        toc.push({ id, text, depth: n.depth, children: [] })
      }
      if (n.children) n.children.forEach(visit)
    }
    
    node.ast.children.forEach(visit)
    return { ...node, toc }
  }
}

function extractText(node: any): string {
  if (node.type === 'text') return node.value
  if (node.children) return node.children.map(extractText).join('')
  return ''
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
}

// Reading Time Calculator
export class ReadingTimeTransformer implements TransformerPlugin {
  name = 'reading-time'
  type = 'transformer' as const
  priority = 20
  private wordsPerMinute = 200

  async transform(node: ContentNode): Promise<ContentNode> {
    const words = node.body.split(/\s+/).length
    const minutes = Math.ceil(words / this.wordsPerMinute)
    return { ...node, readingTime: minutes }
  }
}

// Excerpt Generator
export class ExcerptTransformer implements TransformerPlugin {
  name = 'excerpt-generator'
  type = 'transformer' as const
  priority = 50
  private maxLength = 160

  async transform(node: ContentNode): Promise<ContentNode> {
    const existingExcerpt = node.frontmatter.excerpt
    if (existingExcerpt) {
      return { ...node, excerpt: String(existingExcerpt) }
    }
    const text = node.body.replace(/[#*`\[\]]/g, '').replace(/\n+/g, ' ').trim()
    const excerpt: string = text.length > this.maxLength ? text.substring(0, this.maxLength).trim() + '...' : text
    return { ...node, excerpt }
  }
}
