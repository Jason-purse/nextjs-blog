// ============================================================
// Source Plugin: Local File System
// ============================================================

import type { RawContent, SourcePlugin, PluginContext } from '@/types/pipeline'
import fs from 'fs/promises'
import path from 'path'

export interface LocalFileSourceOptions {
  dir: string
  extensions?: string[]
}

export class LocalFileSource implements SourcePlugin {
  name = 'local-file-source'
  type = 'source' as const

  constructor(private options: LocalFileSourceOptions) {
    this.options.extensions = options.extensions ?? ['.md', '.mdx']
  }

  async fetch(context: PluginContext): Promise<RawContent[]> {
    const files = await this.findFiles(this.options.dir)
    const contents: RawContent[] = []

    for (const file of files) {
      try {
        const body = await fs.readFile(file, 'utf-8')
        const stat = await fs.stat(file)
        const relativePath = path.relative(this.options.dir, file)
        const slug = relativePath.replace(/\.(md|mdx)$/, '')

        contents.push({
          id: slug,
          sourcePlugin: this.name,
          mimeType: file.endsWith('.mdx') ? 'text/mdx' : 'text/markdown',
          body,
          meta: {
            filePath: file,
            relativePath,
            size: stat.size,
            createdAt: stat.birthtime.toISOString(),
            modifiedAt: stat.mtime.toISOString()
          }
        })
      } catch (err) {
        context.logger.warn(`Failed to read file ${file}: ${err}`)
      }
    }

    return contents
  }

  private async findFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          const subFiles = await this.findFiles(fullPath)
          files.push(...subFiles)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (this.options.extensions?.includes(ext)) {
            files.push(fullPath)
          }
        }
      }
    } catch (err) {
      // 目录不存在
    }

    return files
  }
}
