// src/app/api/plugins/runtime/route.ts
// 返回已启用的 WC 插件信息给客户端 PluginRuntime
// plugin.json 优先读 blog-content/installed-plugins/{id}/ 缓存

import { NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

const PLUGINS_REPO   = process.env.GITHUB_THEMES_REPO   ?? 'Jason-purse/blog-plugins'
const PLUGINS_BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'
const TOKEN          = process.env.GITHUB_TOKEN

const GH_HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
}

async function fetchFromRepo(path: string) {
  const res = await fetch(
    `https://api.github.com/repos/${PLUGINS_REPO}/contents/${path}?ref=${PLUGINS_BRANCH}`,
    { headers: GH_HEADERS, next: { revalidate: 300 } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
}

async function readManifest(id: string, source: string) {
  // 优先缓存
  const cached = await storage.read(`installed-plugins/${id}/plugin.json`)
  if (cached) return JSON.parse(cached)
  // fallback
  return fetchFromRepo(`${source}/plugin.json`)
}

export async function GET() {
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
  if (installedIds.length === 0) return NextResponse.json([])

  // 获取 source 映射
  const regRaw = await fetchFromRepo('registry.json')
  if (!regRaw) return NextResponse.json([])
  const sourceMap = Object.fromEntries(
    (regRaw.plugins as { id: string; source: string }[]).map(p => [p.id, p.source])
  )

  const results = await Promise.all(
    installedIds.map(async (id) => {
      const source = sourceMap[id]
      if (!source) return null
      const manifest = await readManifest(id, source)
      if (!manifest?.formats?.webcomponent) return null

      // 合并 schema defaults + 用户 config
      const schema = manifest.config?.schema ?? {}
      const defaults = Object.fromEntries(
        Object.entries(schema).map(([k, f]) => [k, (f as { default: unknown }).default])
      )
      const mergedConfig = { ...defaults, ...installedMap[id] }

      return {
        id,
        source,                                          // 用于客户端拼 asset URL
        wcEntry: manifest.formats.webcomponent.entry as string,
        element: manifest.formats.webcomponent.element as string,
        slots:   (manifest.slots ?? []) as string[],
        config:  mergedConfig,
        cached:  !!(await storage.read(`installed-plugins/${id}/plugin.json`)),
      }
    })
  )

  return NextResponse.json(results.filter(Boolean))
}
