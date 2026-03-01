// src/plugins/toc/index.ts
// 从 MDX 内容提取标题树，注入到 artifacts['toc']
import type { BlogPlugin, BlogInput } from '@/core/plugin'

export interface TocItem {
  id: string
  title: string
  depth: number   // 1=h1, 2=h2, 3=h3
}

export interface TocPluginConfig {
  maxDepth?: number   // 默认 3
}

export function tocPlugin(config: TocPluginConfig = {}): BlogPlugin {
  const maxDepth = config.maxDepth ?? 3

  return {
    name: 'toc',
    transform(input: BlogInput) {
      if (!input.raw) return input

      const headingRegex = /^(#{1,6})\s+(.+)$/gm
      const toc: TocItem[] = []
      let match

      while ((match = headingRegex.exec(input.raw)) !== null) {
        const depth = match[1].length
        if (depth > maxDepth) continue

        const title = match[2].trim()
        const id = title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')

        toc.push({ id, title, depth })
      }

      input.artifacts['toc'] = toc
      return input
    },
  }
}
