// src/plugins/comment/index.ts
// 评论 plugin：声明 Giscus 配置，注入到 artifacts
import type { BlogPlugin, BlogInput } from '@/core/plugin'

export interface GiscusConfig {
  repo: string
  repoId: string
  category: string
  categoryId: string
  mapping?: string
  reactionsEnabled?: boolean
}

export function commentPlugin(config: GiscusConfig): BlogPlugin {
  return {
    name: 'comment',
    setup(ctx) {
      ctx.set('comment:config', config)
    },
    transform(input: BlogInput, ctx) {
      // 将 Giscus 配置注入文章 artifacts，页面组件直接消费
      input.artifacts['comment:config'] = ctx.get('comment:config')
      return input
    },
  }
}
