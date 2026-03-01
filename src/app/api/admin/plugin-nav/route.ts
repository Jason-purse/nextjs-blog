// 返回已安装且有 adminPage 格式的插件列表，供 admin layout 注入侧边栏
import { NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

const LOCAL_REGISTRY = process.env.PLUGIN_REGISTRY_URL

async function getPluginManifest(id: string, source: string) {
  const cached = await storage.read(`installed-plugins/${id}/plugin.json`)
  if (cached) return JSON.parse(cached)
  if (LOCAL_REGISTRY) {
    const { readFile } = await import('fs/promises')
    try {
      return JSON.parse(await readFile(`${LOCAL_REGISTRY}/${source}/plugin.json`, 'utf-8'))
    } catch { return null }
  }
  return null
}

export async function GET() {
  const raw = await storage.read('settings.json')
  if (!raw) return NextResponse.json([])
  const settings = JSON.parse(raw)
  const registry = settings?.plugins?.registry as Record<string, { enabled?: boolean }> | undefined
  if (!registry) return NextResponse.json([])

  const regRaw = LOCAL_REGISTRY
    ? JSON.parse(await (await import('fs/promises')).readFile(`${LOCAL_REGISTRY}/registry.json`, 'utf-8'))
    : null
  const sourceMap = Object.fromEntries(
    (regRaw?.plugins ?? []).map((p: { id: string; source: string }) => [p.id, p.source])
  )

  const results = []
  for (const [id, info] of Object.entries(registry)) {
    if (!info?.enabled) continue
    const source = sourceMap[id]
    if (!source) continue
    const manifest = await getPluginManifest(id, source)
    if (!manifest?.formats?.adminPage) continue
    results.push({
      id,
      name: manifest.name,
      icon: manifest.icon || '🔌',
      nav: manifest.formats.adminPage.nav || { label: manifest.name, icon: manifest.icon || '🔌', section: 'plugins' },
    })
  }

  return NextResponse.json(results)
}
