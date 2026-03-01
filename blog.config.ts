// blog.config.ts
// ============================================================
// AI Blog — Plugin Pipeline 统一入口（仅主题/功能插件，无 fs 依赖）
// input → [plugins] → transform → output
// ============================================================

import { BlogPipeline } from '@/core/plugin'
import { themePlugin, editorial, minimal, tech, warm } from '@/plugins/theme'
import { readingTimePlugin } from '@/plugins/reading-time'
import { tocPlugin } from '@/plugins/toc'
import { viewCountPlugin } from '@/plugins/view-count'
import { commentPlugin } from '@/plugins/comment'

// ── Theme 预设（Plugin #0，地基） ─────────────────────────────
export const THEMES = [editorial, minimal, tech, warm]
export const DEFAULT_THEME = 'editorial'

// ── Pipeline 工厂 ─────────────────────────────────────────────
export function createPipeline(): BlogPipeline {
  return new BlogPipeline()
    .use(themePlugin({
      themes: THEMES,
      default: DEFAULT_THEME,
    }))
    .use(readingTimePlugin())
    .use(tocPlugin({ maxDepth: 3 }))
    .use(viewCountPlugin())
    .use(commentPlugin({
      repo: 'Jason-purse/nextjs-blog',
      repoId: 'R_kgDORbLmXQ',
      category: 'Announcements',
      categoryId: 'DIC_kwDORbLmXc4C3aJl',
      mapping: 'pathname',
      reactionsEnabled: true,
    }))
}

// ── 单例 pipeline（SSR/SSG 场景） ───────────────────────
let _pipeline: BlogPipeline | null = null

export async function getPipeline(): Promise<BlogPipeline> {
  if (!_pipeline) {
    _pipeline = createPipeline()
    await _pipeline.setup()
  }
  return _pipeline
}
