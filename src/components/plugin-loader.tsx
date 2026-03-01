// src/components/plugin-loader.tsx
// 服务端组件：注入已启用插件的 CSS 变量 + 样式
// 优先读 blog-content/installed-plugins/{id}/ 缓存，fallback 才请求 blog-plugins

import React from 'react'
import { storage } from '@/lib/storage'
import type { ConfigSchema } from '@/types/plugin'

const PLUGINS_REPO   = process.env.GITHUB_THEMES_REPO   ?? 'Jason-purse/blog-plugins'
const PLUGINS_BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'
const TOKEN          = process.env.GITHUB_TOKEN
// 本地开发模式：文件系统路径，上线时删除此 env
const LOCAL_REGISTRY = process.env.PLUGIN_REGISTRY_URL

const GH_HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
}

// Fallback：本地文件系统 or blog-plugins GitHub
async function fetchFromPluginsRepo(path: string): Promise<string | null> {
  try {
    if (LOCAL_REGISTRY) {
      const { readFile } = await import('fs/promises')
      return await readFile(`${LOCAL_REGISTRY}/${path}`, 'utf-8')
    }
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
  const cached = await storage.read(`installed-plugins/${id}/plugin.json`)
  if (cached) return JSON.parse(cached)
  const raw = await fetchFromPluginsRepo(`${source}/plugin.json`)
  return raw ? JSON.parse(raw) : null
}

// 读 CSS：优先缓存，fallback 源仓库
async function readCSS(id: string, source: string, cssEntry: string): Promise<string | null> {
  const cached = await storage.read(`installed-plugins/${id}/${cssEntry}`)
  if (cached) return cached
  return fetchFromPluginsRepo(`${source}/${cssEntry}`)
}

// 从 registry.json 获取 source 路径
let regCache: { plugins: { id: string; source: string }[] } | null = null
async function getRegistry() {
  if (regCache) return regCache
  const raw = await fetchFromPluginsRepo('registry.json')
  if (!raw) return null
  regCache = JSON.parse(raw)
  return regCache
}

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

  const reg = await getRegistry()
  const sourceMap = Object.fromEntries((reg?.plugins ?? []).map(p => [p.id, p.source]))

  const results = await Promise.all(
    installedIds.map(async (id) => {
      const source = sourceMap[id] ?? `plugins/content/${id}`
      const manifest = await readManifest(id, source)
      if (!manifest) return null

      const cssEntry: string | undefined = (manifest?.formats as Record<string, { entry?: string }>)?.css?.entry
      const schema: ConfigSchema = (manifest?.config as { schema?: ConfigSchema })?.schema ?? {}
      const userConfig = installedMap[id]
      const cssVars = buildCssVars(schema, userConfig)
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
        <React.Fragment key={id}>
          {cssVars && (
            <style data-plugin-vars={id} dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
          )}
          {css && (
            <style data-plugin={id} dangerouslySetInnerHTML={{ __html: css }} />
          )}
        </React.Fragment>
      ))}
    </>
  )
}
