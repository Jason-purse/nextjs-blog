// src/components/plugin-loader.tsx
// 服务端组件：从 settings.json 读已安装插件，注入 CSS 到 <head>

import { storage } from '@/lib/storage'

const REGISTRY_REPO   = process.env.GITHUB_THEMES_REPO   ?? 'Jason-purse/blog-themes'
const REGISTRY_BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'
const TOKEN           = process.env.GITHUB_TOKEN

// 读插件 CSS（通过 GitHub API）
async function fetchPluginCSS(pluginId: string, cssPath: string): Promise<string | null> {
  try {
    const path = `plugins/${pluginId}/${cssPath}`
    const res = await fetch(
      `https://api.github.com/repos/${REGISTRY_REPO}/contents/${path}?ref=${REGISTRY_BRANCH}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
        },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return Buffer.from(data.content, 'base64').toString('utf-8')
  } catch {
    return null
  }
}

// 读 plugin.json 找 CSS 入口
async function fetchPluginManifest(pluginId: string): Promise<{ cssEntry?: string } | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REGISTRY_REPO}/contents/plugins/${pluginId}/plugin.json?ref=${REGISTRY_BRANCH}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
        },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const manifest = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
    // 取 css format 的入口文件
    const cssEntry = manifest?.formats?.css?.entry as string | undefined
    return { cssEntry }
  } catch {
    return null
  }
}

export async function PluginLoader() {
  // 读 settings.json 获取已安装插件列表
  let installed: string[] = []
  try {
    const raw = await storage.read('settings.json')
    if (raw) {
      const settings = JSON.parse(raw)
      installed = settings?.plugins?.installed ?? []
    }
  } catch {
    // settings.json 不存在时忽略
  }

  if (installed.length === 0) return null

  // 并行加载所有已安装插件的 CSS
  const styles = await Promise.all(
    installed.map(async (id) => {
      const manifest = await fetchPluginManifest(id)
      if (!manifest?.cssEntry) return null
      const css = await fetchPluginCSS(id, manifest.cssEntry)
      return css ? { id, css } : null
    })
  )

  const valid = styles.filter(Boolean) as { id: string; css: string }[]
  if (valid.length === 0) return null

  return (
    <>
      {valid.map(({ id, css }) => (
        <style key={id} data-plugin={id} dangerouslySetInnerHTML={{ __html: css }} />
      ))}
    </>
  )
}
