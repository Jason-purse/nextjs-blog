// ============================================================
// Pipeline Core Types - Input → Transformer → Output 架构
// ============================================================

import type { Root } from 'mdast'

// ============================================================
// 1. RawContent - 原始内容 (Source 输出)
// ============================================================

export interface RawContent {
  id: string
  sourcePlugin: string
  mimeType: string          // 'text/mdx' | 'text/markdown' | 'application/json'
  body: string             // 原始字符串
  meta: Record<string, unknown>  // 源自带的元数据
}

// ============================================================
// 2. ContentNode - 统一内容节点 (Parser 输出, Transformer 输入/输出)
// ============================================================

export interface ContentNode {
  // 身份
  id: string
  slug: string
  path: string             // URL 路径，如 '/posts/hello-world'

  // 来源
  source: string           // sourcePlugin name
  rawContent: string       // 原始文本
  mimeType: string

  // 内容
  ast: Root | null        // unified/mdast AST
  frontmatter: Frontmatter
  body: string            // 正文 (去除 frontmatter 后)

  // 计算字段 (Transformer 填充)
  readingTime?: number
  toc?: TocItem[]
  relatedPosts?: string[]
  excerpt?: string
  codeBlocks?: CodeBlock[]

  // 渲染产物 (Emitter 填充)
  compiled?: {
    code: string
    frontmatter: Frontmatter
  }

  // 系统字段
  createdAt: Date
  updatedAt: Date
  _errors: TransformError[]
  _meta: Record<string, unknown>   // 插件间通信的临时数据
}

export interface Frontmatter {
  title: string
  date: string
  tags?: string[]
  draft?: boolean
  [key: string]: unknown
}

export interface TocItem {
  id: string
  text: string
  depth: number
  children: TocItem[]
}

export interface CodeBlock {
  language: string
  content: string
}

export interface TransformError {
  stage: PipelineStage
  plugin: string
  error: Error
  severity: 'warning' | 'error' | 'fatal'
}

export type PipelineStage = 'source' | 'parse' | 'transform' | 'emit'

// ============================================================
// 3. 插件接口
// ============================================================

// 插件上下文
export interface PluginContext {
  logger: Logger
  config: BlogConfig
  cache: CacheAdapter
  getNode(slug: string): ContentNode | undefined
  getAllNodes(): ContentNode[]
}

export interface Logger {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string, err?: Error): void
  debug(msg: string): void
}

export interface BlogConfig {
  title: string
  description?: string
  siteUrl?: string
  [key: string]: unknown
}

export interface CacheAdapter {
  get(key: string): unknown | undefined
  set(key: string, value: unknown): void
  delete(key: string): void
}

// --- Source Plugin ---
export interface SourcePlugin {
  name: string
  type: 'source'
  fetch(context: PluginContext): Promise<RawContent[]>
  watch?(context: PluginContext, onChange: (changed: RawContent, event: 'add' | 'change' | 'unlink') => void): Promise<() => void>
}

// --- Parser Plugin ---
export interface ParserPlugin {
  name: string
  type: 'parser'
  accept: string | string[] | ((raw: RawContent) => boolean)
  parse(raw: RawContent, context: PluginContext): Promise<ContentNode>
}

// --- Transformer Plugin (纯函数) ---
export interface TransformerPlugin {
  name: string
  type: 'transformer'
  priority?: number           // 越小越先执行，默认 50
  dependsOn?: string[]       // 依赖其他 transformer
  filter?(node: ContentNode): boolean
  transform(node: ContentNode, context: PluginContext): Promise<ContentNode>
}

// --- Emitter Plugin ---
export interface EmitterPlugin {
  name: string
  type: 'emitter'
  outputType: 'react' | 'json' | 'xml' | 'file'
  emit(node: ContentNode, context: PluginContext): Promise<EmitResult>
}

export type EmitResult =
  | { type: 'react'; Component: React.ComponentType; props: Record<string, unknown> }
  | { type: 'json'; data: unknown }
  | { type: 'xml'; content: string }
  | { type: 'file'; path: string; content: string | Buffer }

// --- Hook Plugin ---
export type HookPoint =
  | 'pipeline:start' | 'pipeline:end'
  | 'source:before' | 'source:after'
  | 'parse:before' | 'parse:after'
  | 'transform:before' | 'transform:after'
  | 'emit:before' | 'emit:after'
  | 'error'

export interface HookEvent<T = unknown> {
  point: HookPoint
  payload: T
  error?: Error
  timestamp: number
}

export interface HookPlugin {
  name: string
  type: 'hook'
  on: HookPoint | HookPoint[]
  handler(event: HookEvent, context: PluginContext): Promise<void>
}

// --- 联合类型 ---
export type AnyPlugin =
  | SourcePlugin
  | ParserPlugin
  | TransformerPlugin
  | EmitterPlugin
  | HookPlugin

// ============================================================
// 4. Pipeline 配置与引擎
// ============================================================

export interface PipelineConfig {
  sources: SourcePlugin[]
  parsers: ParserPlugin[]
  transformers: TransformerPlugin[]
  emitters: EmitterPlugin[]
  hooks: HookPlugin[]
  context?: PluginContext
}

// 失败策略
export interface FailurePolicy {
  onError: 'throw' | 'skip' | 'fallback' | 'retry'
  retry?: {
    maxAttempts: number
    backoff: 'immediate' | 'linear' | 'exponential'
    delayMs: number
  }
  circuitBreaker?: {
    failureThreshold: number
    resetTimeout: number
  }
}

export const DEFAULT_FAILURE_POLICY: FailurePolicy = {
  onError: 'skip',
  retry: { maxAttempts: 3, backoff: 'exponential', delayMs: 1000 },
  circuitBreaker: { failureThreshold: 5, resetTimeout: 60000 }
}
