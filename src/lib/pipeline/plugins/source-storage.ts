// ============================================================
// Source Plugin: Storage (支持 GitHub API / 本地 storage)
// ============================================================

import type { RawContent, SourcePlugin, PluginContext } from '@/types/pipeline'
import { storage } from '../../storage'

export interface StorageSourceOptions {
  prefix?: string  // 如 'posts'
  extensions?: string[]
}

export class StorageSource implements SourcePlugin {
  name = 'storage-source'
  type = 'source' as const

  constructor(private options: StorageSourceOptions = {}) {
    this.options.extensions = options.extensions ?? ['.md', '.mdx']
  }

  async fetch(context: PluginContext): Promise<RawContent[]> {
    const prefix = this.options.prefix || ''
    const files = await storage.list(prefix)
    const contents: RawContent[] = []

    const filtered = files.filter(f => 
      this.options.extensions?.some(ext => f.endsWith(ext))
    )

    for (const file of filtered) {
      try {
        // storage.list() 只返回文件名（如 'typescript-tips.mdx'），不含目录前缀
        // storage.read() 需要完整相对路径（如 'posts/typescript-tips.mdx'）
        const fullPath = prefix ? `${prefix}/${file}` : file
        const raw = await storage.read(fullPath)
        if (!raw) continue
        
        // 提取 slug：去掉扩展名
        const slug = file.replace(/\.(md|mdx)$/, '')

        contents.push({
          id: slug,
          sourcePlugin: this.name,
          mimeType: file.endsWith('.mdx') ? 'text/mdx' : 'text/markdown',
          body: raw,
          meta: {
            filePath: fullPath,
            relativePath: fullPath
          }
        })
      } catch (err) {
        context.logger.warn(`Failed to read ${file}: ${err}`)
      }
    }

    return contents
  }
}
