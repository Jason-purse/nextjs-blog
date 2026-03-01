// ============================================================
// Pipeline - Main Export
// ============================================================

// 引擎
export { ContentPipeline, createPipeline } from './engine'

// 类型
export type { 
  RawContent,
  ContentNode,
  Frontmatter,
  TocItem,
  CodeBlock,
  TransformError,
  PipelineStage,
  PluginContext,
  Logger,
  BlogConfig,
  CacheAdapter,
  SourcePlugin,
  ParserPlugin,
  TransformerPlugin,
  EmitterPlugin,
  HookPlugin,
  AnyPlugin,
  HookPoint,
  HookEvent,
  EmitResult,
  PipelineConfig,
  FailurePolicy
} from '@/types/pipeline'

// 插件
export { LocalFileSource } from './plugins/source-local'
export { StorageSource } from './plugins/source-storage'
export { MarkdownParser } from './plugins/parser-markdown'
export { TocTransformer } from './plugins/parser-markdown'
export { ReadingTimeTransformer } from './plugins/parser-markdown'
export { ExcerptTransformer } from './plugins/parser-markdown'

// 插件选项类型
export type { LocalFileSourceOptions } from './plugins/source-local'
export type { StorageSourceOptions } from './plugins/source-storage'
