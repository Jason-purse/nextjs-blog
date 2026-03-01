// src/app/api/plugins/runtime/route.ts
// 返回已启用的 WC/JS 插件信息（供客户端 PluginRuntime 使用）
// CSS 插件由服务端 PluginLoader 处理；WC 插件由客户端 PluginRuntime 处理

import { NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

const REGISTRY_REPO   = process.env.GITHUB_THEMES_REPO   ?? 'Jason-purse/blog-plugins'
const REGISTRY_BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'
const TOKEN           = process.env.GITHUB_TOKEN

const GH_HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
}

async function fetchFile(path: string) {
  const res = await fetch(
    `https://api.github.com/repos/${REGISTRY_REPO}/contents/${path}?ref=${REGISTRY_BRANCH}`,
    { headers: GH_HEADERS, next: { revalidate: 300 } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
}

export async function GET() {
  // 读 settings.json，取已启用插件和用户 config（兼容新旧格式）
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

  // 读 registry.json 获取 source 路径
  const registry = await fetchFile('registry.json')
  if (!registry) return NextResponse.json([])
  const sourceMap = Object.fromEntries(
    (registry.plugins as { id: string; source: string }[]).map(p => [p.id, p.source])
  )

  // 找有 webcomponent 格式的插件
  const results = await Promise.all(
    installedIds.map(async (id) => {
      const source = sourceMap[id]
      if (!source) return null
      const manifest = await fetchFile(`${source}/plugin.json`)
      if (!manifest?.formats?.webcomponent) return null

      // 合并 schema defaults + 用户 config
      const schema = manifest.config?.schema ?? {}
      const defaults = Object.fromEntries(
        Object.entries(schema).map(([k, f]) => [k, (f as { default: unknown }).default])
      )
      const userConfig = installedMap[id]
      const mergedConfig = { ...defaults, ...userConfig }

      return {
        id,
        source,
        wcEntry: manifest.formats.webcomponent.entry as string,
        element: manifest.formats.webcomponent.element as string,
        slots: (manifest.slots ?? []) as string[],
        config: mergedConfig,
      }
    })
  )

  return NextResponse.json(results.filter(Boolean))
}
