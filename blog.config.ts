// blog.config.ts
// ============================================================
// AI Blog — Plugin Pipeline 统一入口
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
// 每次需要处理文章时调用，保持无状态
export function createPipeline(): BlogPipeline {
  return new BlogPipeline()
    // #0 主题：必须第一个，其他 plugin 可能依赖主题 ctx
    .use(themePlugin({
      themes: THEMES,
      default: DEFAULT_THEME,
    }))

    // #1 内容分析
    .use(readingTimePlugin())
    .use(tocPlugin({ maxDepth: 3 }))

    // #2 交互功能
    .use(viewCountPlugin())
    .use(commentPlugin({
      repo: 'Jason-purse/nextjs-blog',
      repoId: 'R_kgDORbLmXQ',
      category: 'Announcements',
      categoryId: 'DIC_kwDORbLmXc4C3aJl',
      mapping: 'pathname',
      reactionsEnabled: true,
    }))

    // 未来扩展（按需取消注释）：
    // .use(bilingualPlugin({ defaultLang: 'zh' }))
    // .use(aiSummaryPlugin({ provider: 'minimax' }))
    // .use(syntaxPlugin({ theme: 'github-dark' }))
}

// ── 单例 pipeline（用于 SSR/SSG 场景） ───────────────────────
let _pipeline: BlogPipeline | null = null

export async function getPipeline(): Promise<BlogPipeline> {
  if (!_pipeline) {
    _pipeline = createPipeline()
    await _pipeline.setup()
  }
  return _pipeline
}
