// src/components/plugin-loader.tsx
// 服务端组件：从 settings.json 读已安装插件，注入 CSS 到 <head>

import { storage } from '@/lib/storage'

const REGISTRY_REPO   = process.env.GITHUB_THEMES_REPO   ?? 'Jason-purse/blog-plugins'
const REGISTRY_BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'
const TOKEN           = process.env.GITHUB_TOKEN

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
    const cssEntry = manifest?.formats?.css?.entry as string | undefined
    return { cssEntry }
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
