// src/app/api/plugins/runtime/route.ts
// 返回已安装的 JS 插件信息（供客户端 PluginRuntime 使用）
// 只返回 webcomponent 格式的插件，CSS 插件由服务端处理

import { NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

const REGISTRY_REPO   = process.env.GITHUB_THEMES_REPO   ?? 'Jason-purse/blog-themes'
const REGISTRY_BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'
const TOKEN           = process.env.GITHUB_TOKEN

async function fetchManifest(pluginId: string) {
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
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
}

export async function GET() {
  // 读已安装插件
  let installed: string[] = []
  try {
    const raw = await storage.read('settings.json')
    if (raw) installed = JSON.parse(raw)?.plugins?.installed ?? []
  } catch { /* ignore */ }

  if (installed.length === 0) return NextResponse.json([])

  // 过滤出有 webcomponent 格式的插件
  const results = await Promise.all(
    installed.map(async (id) => {
      const manifest = await fetchManifest(id)
      if (!manifest?.formats?.webcomponent) return null
      return {
        id,
        wcEntry: manifest.formats.webcomponent.entry as string,
        element: manifest.formats.webcomponent.element as string,
        slots: manifest.slots ?? [],
        config: manifest.config
          ? Object.fromEntries(
              Object.entries(manifest.config).map(([k, v]) => [k, (v as { default?: unknown }).default])
            )
          : {},
      }
    })
  )

  return NextResponse.json(results.filter(Boolean))
}
