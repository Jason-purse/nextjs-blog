// src/components/plugin-loader.tsx
// 服务端组件：从 settings.json 读已安装插件，注入 CSS 到 <head>
// 路径从 registry.json 的 source 字段获取，格式：plugins/{category}/{id}

import { storage } from '@/lib/storage'

const REGISTRY_REPO   = process.env.GITHUB_THEMES_REPO   ?? 'Jason-purse/blog-plugins'
const REGISTRY_BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'
const TOKEN           = process.env.GITHUB_TOKEN

const GH_HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
}

// 从 registry.json 获取指定 id 的 source 路径
async function fetchPluginSource(pluginId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REGISTRY_REPO}/contents/registry.json?ref=${REGISTRY_BRANCH}`,
      { headers: GH_HEADERS, next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const reg = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
    const plugin = (reg.plugins as { id: string; source: string }[]).find(p => p.id === pluginId)
    return plugin?.source ?? null
  } catch {
    return null
  }
}

// 读插件目录下的 plugin.json，返回 cssEntry
async function fetchPluginManifest(source: string): Promise<{ cssEntry?: string } | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REGISTRY_REPO}/contents/${source}/plugin.json?ref=${REGISTRY_BRANCH}`,
      { headers: GH_HEADERS, next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const manifest = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
    const cssEntry = manifest?.formats?.css?.entry as string | undefined
    return { cssEntry }
  } catch {
    return null
  }
}

// 读 CSS 文件内容
async function fetchPluginCSS(source: string, cssPath: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REGISTRY_REPO}/contents/${source}/${cssPath}?ref=${REGISTRY_BRANCH}`,
      { headers: GH_HEADERS, next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return Buffer.from(data.content, 'base64').toString('utf-8')
  } catch {
    return null
  }
}

export async function PluginLoader() {
  let installed: string[] = []
  try {
    const raw = await storage.read('settings.json')
    if (raw) {
      const settings = JSON.parse(raw)
      const registry = settings?.plugins?.registry
      if (registry) {
        installed = Object.keys(registry).filter(id => registry[id]?.enabled)
      } else {
        installed = settings?.plugins?.installed ?? []
      }
    }
  } catch {}

  if (installed.length === 0) return null

  const styles = await Promise.all(
    installed.map(async (id) => {
      // 先从 registry 拿 source（含分类目录）
      const source = await fetchPluginSource(id)
      if (!source) return null
      const manifest = await fetchPluginManifest(source)
      if (!manifest?.cssEntry) return null
      const css = await fetchPluginCSS(source, manifest.cssEntry)
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
