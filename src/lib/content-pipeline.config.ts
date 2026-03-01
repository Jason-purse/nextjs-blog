// ============================================================
// Content Pipeline 配置 (Server-only)
// SOURCE → PARSER → TRANSFORMER → EMITTER
// 只在 Server Component / Route Handler 中使用，不可被 Client Component import
// ============================================================

import { StorageSource } from '@/lib/pipeline/plugins/source-storage'
import {
  MarkdownParser,
  TocTransformer,
  ReadingTimeTransformer,
  ExcerptTransformer,
} from '@/lib/pipeline/plugins/parser-markdown'
import type { PipelineConfig } from '@/types/pipeline'

export type ContentPipelineConfig = Omit<PipelineConfig, 'context'>

export const contentPipelineConfig: ContentPipelineConfig = {
  // 1. Source: 从 storage（GitHub API / 本地 fs）读取原始内容
  sources: [
    new StorageSource({
      prefix: 'posts',
      extensions: ['.md', '.mdx'],
    }),
  ],

  // 2. Parser: 解析 Markdown/MDX frontmatter + AST
  parsers: [
    new MarkdownParser(),
  ],

  // 3. Transformers: 纯函数，按 priority 排序
  transformers: [
    new ReadingTimeTransformer(),  // priority 20 — 阅读时间
    new TocTransformer(),          // priority 40 — 目录
    new ExcerptTransformer(),      // priority 50 — 摘要
  ],

  // 4. Emitters & Hooks（后续扩展）
  emitters: [],
  hooks: [],
}
