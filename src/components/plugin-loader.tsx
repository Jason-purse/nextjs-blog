// src/components/plugin-loader.tsx
// 服务端组件：加载已启用插件的 CSS，并注入用户配置为 CSS 变量
// 路径格式：plugins/{category}/{id}（来自 registry.json 的 source 字段）

import { storage } from '@/lib/storage'
import type { ConfigSchema } from '@/types/plugin'

const REGISTRY_REPO   = process.env.GITHUB_THEMES_REPO   ?? 'Jason-purse/blog-plugins'
const REGISTRY_BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'
const TOKEN           = process.env.GITHUB_TOKEN

const GH_HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
}

async function fetchFile(path: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REGISTRY_REPO}/contents/${path}?ref=${REGISTRY_BRANCH}`,
      { headers: GH_HEADERS, next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return Buffer.from(data.content, 'base64').toString('utf-8')
  } catch { return null }
}

// 从 registry.json 批量获取 source 映射表
let registryCache: { plugins: { id: string; source: string }[] } | null = null
async function getRegistry() {
  if (registryCache) return registryCache
  const raw = await fetchFile('registry.json')
  if (!raw) return null
  registryCache = JSON.parse(raw)
  return registryCache
}

// 从 schema 默认值 + 用户 config 生成 CSS 变量字符串
function buildCssVars(schema: ConfigSchema, userConfig: Record<string, unknown>): string {
  const vars: string[] = []
  for (const [key, field] of Object.entries(schema)) {
    if (!field.cssVar) continue
    const value = userConfig[key] ?? (field as { default: unknown }).default
    if (value === undefined || value === null) continue
    // range/number: 可能需要加单位
    const unit = (field as { unit?: string }).unit ?? ''
    vars.push(`${field.cssVar}: ${value}${unit}`)
  }
  return vars.join('; ')
}

export async function PluginLoader() {
  // 读 settings.json，获取已启用插件及其用户 config
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
        // 旧格式降级
        for (const id of (settings?.plugins?.installed ?? []) as string[]) {
          installedMap[id] = {}
        }
      }
    }
  } catch {}

  const installedIds = Object.keys(installedMap)
  if (installedIds.length === 0) return null

  const reg = await getRegistry()
  if (!reg) return null

  const sourceMap = Object.fromEntries(reg.plugins.map(p => [p.id, p.source]))

  const results = await Promise.all(
    installedIds.map(async (id) => {
      const source = sourceMap[id]
      if (!source) return null

      // 读 plugin.json 获取 schema 和 cssEntry
      const manifestRaw = await fetchFile(`${source}/plugin.json`)
      if (!manifestRaw) return null
      const manifest = JSON.parse(manifestRaw)

      const cssEntry: string | undefined = manifest?.formats?.css?.entry
      const schema: ConfigSchema = manifest?.config?.schema ?? {}
      const userConfig = installedMap[id]

      // 生成 CSS 变量
      const cssVars = buildCssVars(schema, userConfig)

      // 读插件 CSS
      let css: string | null = null
      if (cssEntry) {
        css = await fetchFile(`${source}/${cssEntry}`)
      }

      return { id, cssVars, css }
    })
  )

  const valid = results.filter(Boolean) as { id: string; cssVars: string; css: string | null }[]
  if (valid.length === 0) return null

  return (
    <>
      {valid.map(({ id, cssVars, css }) => (
        <span key={id}>
          {/* 先注入配置变量，再注入插件 CSS（插件 CSS 使用 var() 引用） */}
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
