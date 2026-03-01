// src/components/plugin-loader.tsx
// 服务端组件：注入已启用插件的 CSS 变量 + 样式
// 优先读 blog-content/installed-plugins/{id}/ 缓存，fallback 才请求 blog-plugins

import { storage } from '@/lib/storage'
import type { ConfigSchema } from '@/types/plugin'

const PLUGINS_REPO   = process.env.GITHUB_THEMES_REPO   ?? 'Jason-purse/blog-plugins'
const PLUGINS_BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'
const TOKEN          = process.env.GITHUB_TOKEN

const GH_HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
}

// Fallback：从 blog-plugins 拉文件
async function fetchFromPluginsRepo(path: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${PLUGINS_REPO}/contents/${path}?ref=${PLUGINS_BRANCH}`,
      { headers: GH_HEADERS, next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return Buffer.from(data.content, 'base64').toString('utf-8')
  } catch { return null }
}

// 读 plugin.json：优先缓存，fallback 源仓库
async function readManifest(id: string, source: string): Promise<Record<string, unknown> | null> {
  // 先读 blog-content 缓存
  const cached = await storage.read(`installed-plugins/${id}/plugin.json`)
  if (cached) return JSON.parse(cached)
  // fallback
  const raw = await fetchFromPluginsRepo(`${source}/plugin.json`)
  return raw ? JSON.parse(raw) : null
}

// 读 CSS：优先缓存，fallback 源仓库
async function readCSS(id: string, source: string, cssEntry: string): Promise<string | null> {
  const cached = await storage.read(`installed-plugins/${id}/${cssEntry}`)
  if (cached) return cached
  return fetchFromPluginsRepo(`${source}/${cssEntry}`)
}

// 从 registry.json 获取 source 路径（缓存 5 分钟）
let regCache: { plugins: { id: string; source: string }[] } | null = null
async function getRegistry() {
  if (regCache) return regCache
  const raw = await fetchFromPluginsRepo('registry.json')
  if (!raw) return null
  regCache = JSON.parse(raw)
  return regCache
}

// 将用户 config 合并 schema defaults，生成 CSS 变量字符串
function buildCssVars(schema: ConfigSchema, userConfig: Record<string, unknown>): string {
  return Object.entries(schema)
    .filter(([, field]) => field.cssVar)
    .map(([key, field]) => {
      const value = userConfig[key] ?? (field as { default: unknown }).default
      const unit  = (field as { unit?: string }).unit ?? ''
      return `${field.cssVar}: ${value}${unit}`
    })
    .join('; ')
}

export async function PluginLoader() {
  // 读 settings.json：取已启用插件 id + 用户 config
  let installedMap: Record<string, Record<string, unknown>> = {}
  try {
    const raw = await storage.read('settings.json')
    if (raw) {
      const settings = JSON.parse(raw)
      const registry = settings?.plugins?.registry
      if (registry) {
        for (const [id, info] of Object.entries(registry as Record<string, { enabled?: boolean; config?: Record<string, unknown> }>)) {
          if (info?.enabled) installedMap[id] = info.config ?? {}
        }
      } else {
        for (const id of (settings?.plugins?.installed ?? []) as string[]) {
          installedMap[id] = {}
        }
      }
    }
  } catch {}

  const installedIds = Object.keys(installedMap)
  if (installedIds.length === 0) return null

  // 获取 source 路径映射（用于 fallback）
  const reg = await getRegistry()
  const sourceMap = Object.fromEntries((reg?.plugins ?? []).map(p => [p.id, p.source]))

  const results = await Promise.all(
    installedIds.map(async (id) => {
      const source = sourceMap[id] ?? `plugins/content/${id}` // safe fallback

      const manifest = await readManifest(id, source)
      if (!manifest) return null

      const cssEntry: string | undefined = (manifest?.formats as Record<string, { entry?: string }>)?.css?.entry
      const schema: ConfigSchema = (manifest?.config as { schema?: ConfigSchema })?.schema ?? {}
      const userConfig = installedMap[id]

      // CSS 变量（用户配置合并 schema 默认值）
      const cssVars = buildCssVars(schema, userConfig)

      // CSS 内容
      let css: string | null = null
      if (cssEntry) css = await readCSS(id, source, cssEntry)

      return { id, cssVars, css }
    })
  )

  const valid = results.filter(Boolean) as { id: string; cssVars: string; css: string | null }[]
  if (valid.length === 0) return null

  return (
    <>
      {valid.map(({ id, cssVars, css }) => (
        <span key={id}>
          {cssVars && (
            <style data-plugin-vars={id} dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
          )}
          {css && (
            <style data-plugin={id} dangerouslySetInnerHTML={{ __html: css }} />
          )}
        </span>
      ))}
    </>
  )
}
