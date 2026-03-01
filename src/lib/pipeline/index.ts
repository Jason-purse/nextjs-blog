// ============================================================
// Pipeline Core - Main Export
// ============================================================

export { ContentPipeline, createPipeline } from './engine'

// Re-export from types
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
  FailurePolicy,
  AnyPlugin as Plugin
} from '@/types/pipeline'

// Built-in plugins (classes)
export { LocalFileSource } from './plugins/source-local'
export { MarkdownParser, TocTransformer, ReadingTimeTransformer, ExcerptTransformer } from './plugins/parser-markdown'

// Types for plugins
export type { LocalFileSourceOptions } from './plugins/source-local'
