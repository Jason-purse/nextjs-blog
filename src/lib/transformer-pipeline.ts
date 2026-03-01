// ============================================================
// Transformer Pipeline Executor
// 按 phase/priority 顺序执行所有转换器
// ============================================================

import {
  TransformerInput,
  TransformerOutput,
  TransformerMetadata,
  ContentTransformer,
  RenderContext,
  BUILTIN_TRANSFORMERS,
  TransformerPhase
} from '@/types/transformer'

/** 插件转换器注册表（从插件系统加载） */
let pluginTransformers: Map<string, ContentTransformer> = new Map()

/** 注册插件转换器 */
export function registerTransformer(t: ContentTransformer): void {
  pluginTransformers.set(t.id, t)
}

/** 批量注册 */
export function registerTransformers(transformers: ContentTransformer[]): void {
  transformers.forEach(t => registerTransformer(t))
}

/** 清空注册表（测试用） */
export function clearTransformers(): void {
  pluginTransformers.clear()
}

/** 初始化：从插件设置中加载已启用的转换器 */
export async function initTransformersFromPlugins(): Promise<void> {
  // TODO: 从 settings.json 读取已启用插件
  // 筛选出 category: 'hook' 的插件，加载其 transform/extract/render 函数
  // 这里先跳过，等插件系统完善后对接
}

/** 执行顺序：early → middle → late → render */
const PHASE_ORDER: TransformerPhase[] = ['early', 'middle', 'late', 'render']

/** 执行转换管道 */
export async function runPipeline(input: TransformerInput): Promise<TransformerOutput> {
  // 1. 收集所有转换器（内置 + 插件）
  const allTransformers = [
    ...BUILTIN_TRANSFORMERS,
    ...Array.from(pluginTransformers.values())
  ]
    .filter(t => t.enabled !== false)  // 默认启用
    .sort((a, b) => {
      // 先按 phase 排序
      const phaseA = PHASE_ORDER.indexOf(a.phase)
      const phaseB = PHASE_ORDER.indexOf(b.phase)
      if (phaseA !== phaseB) return phaseA - phaseB
      // 同 phase 按 priority 排序
      return a.priority - b.priority
    })

  let currentInput = { ...input }
  let metadata: TransformerMetadata = {}
  
  // 2. 执行 extract + transform（early → middle → late）
  for (const t of allTransformers) {
    if (t.phase === 'render') continue  // render 阶段单独处理
    
    try {
      // 元数据提取（early phase 专用）
      if (t.extract && t.phase === 'early') {
        const extracted = await t.extract(currentInput)
        metadata = { ...metadata, ...extracted }
      }
      
      // 同步转换
      if (t.transform) {
        currentInput = await t.transform(currentInput)
      }
      
      // 异步转换
      if (t.transformAsync) {
        currentInput = await t.transformAsync(currentInput)
      }
    } catch (e) {
      console.warn(`[Transformer] ${t.id} failed:`, e)
    }
  }

  // 3. 渲染阶段：收集所有 render 输出
  let renderInjections: string[] = []
  for (const t of allTransformers) {
    if (t.phase !== 'render' || !t.render) continue
    
    try {
      const ctx: RenderContext = {
        slug: currentInput.slug,
        title: currentInput.frontmatter.title || '',
        description: currentInput.frontmatter.description,
        tags: currentInput.frontmatter.tags,
        author: currentInput.frontmatter.author,
        publishedAt: currentInput.frontmatter.date,
        modifiedAt: currentInput.frontmatter.modified,
        metadata,
        frontmatter: currentInput.frontmatter,
        html: ''  // 此时还没渲染 HTML，传空字符串
      }
      const injection = await t.render(ctx)
      if (injection) {
        renderInjections.push(injection)
      }
    } catch (e) {
      console.warn(`[Transformer] ${t.id} render failed:`, e)
    }
  }

  // 4. 返回结果
  return {
    content: currentInput.content,
    metadata: {
      ...metadata,
      _renderInjections: renderInjections  // 供渲染层使用
    }
  }
}

/** 便捷函数：从 Post 直接运行管道 */
export async function processPost(
  slug: string,
  content: string,
  frontmatter: Record<string, any>
): Promise<TransformerOutput> {
  const input: TransformerInput = {
    content,
    frontmatter,
    slug,
    locale: frontmatter.locale || 'zh-CN'
  }
  return runPipeline(input)
}

/** 获取指定转换器 */
export function getTransformer(id: string): ContentTransformer | undefined {
  return pluginTransformers.get(id)
}

/** 列出所有已注册转换器（调试用） */
export function listTransformers(): ContentTransformer[] {
  return [
    ...BUILTIN_TRANSFORMERS,
    ...Array.from(pluginTransformers.values())
  ].sort((a, b) => {
    const phaseA = PHASE_ORDER.indexOf(a.phase)
    const phaseB = PHASE_ORDER.indexOf(b.phase)
    if (phaseA !== phaseB) return phaseA - phaseB
    return a.priority - b.priority
  })
}

// Re-export types for convenience
export type {
  TransformerInput,
  TransformerOutput,
  TransformerMetadata,
  ContentTransformer,
  RenderContext,
  TransformerPhase,
  TOCItem,
  CodeBlock,
  ImageInfo,
  LinkInfo
} from '@/types/transformer'
