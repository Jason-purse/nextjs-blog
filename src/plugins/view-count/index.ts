// src/plugins/view-count/index.ts
// 阅读量 plugin：从 GitHub API 读/写 view counts
// transform 阶段注入 viewCount 到 meta，实际增量由客户端组件触发
import type { BlogPlugin } from '@/core/plugin'

export interface ViewCountPluginConfig {
  /** 暂未使用，预留给未来切换 backend（redis/upstash 等） */
  backend?: 'github-api' | 'upstash'
}

export function viewCountPlugin(_config: ViewCountPluginConfig = {}): BlogPlugin {
  return {
    name: 'view-count',
    setup(ctx) {
      ctx.set('viewCount:enabled', true)
    },
    // transform 阶段不做网络请求（SSR 性能考量）
    // 实际读写由 /api/views route + <ViewCount> 客户端组件完成
    // plugin 的职责：声明自己已注册，让其他 plugin/组件知道该能力存在
  }
}
