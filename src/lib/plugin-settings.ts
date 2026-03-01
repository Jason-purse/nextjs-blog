// src/lib/plugin-settings.ts
// 读取 settings.json 中的插件开关状态（服务端用）

import { storage } from '@/lib/storage'

// 默认启用的核心插件（settings.json 里没配置时的兜底）
const DEFAULT_ENABLED = ['ai-summary', 'giscus-comments', 'reading-progress']

let cache: { enabled: Set<string>; ts: number } | null = null
const TTL = 30_000

async function getEnabledSet(): Promise<Set<string>> {
  const now = Date.now()
  if (cache && now - cache.ts < TTL) return cache.enabled

  try {
    const raw = await storage.read('settings.json')
    const settings = raw ? JSON.parse(raw) : {}
    const plugins = settings?.plugins ?? {}

    let enabled: string[]

    // 新格式：plugins.registry
    if (plugins.registry && typeof plugins.registry === 'object') {
      enabled = Object.values(plugins.registry as Record<string, { enabled: boolean }>)
        .filter(p => p.enabled)
        .map(p => (p as unknown as { id: string }).id)
    }
    // 旧格式：plugins.installed[]
    else if (Array.isArray(plugins.installed)) {
      enabled = plugins.installed as string[]
    }
    else {
      enabled = DEFAULT_ENABLED
    }

    const set = new Set(enabled)
    cache = { enabled: set, ts: now }
    return set
  } catch {
    return new Set(DEFAULT_ENABLED)
  }
}

export async function isPluginEnabled(pluginId: string): Promise<boolean> {
  const set = await getEnabledSet()
  return set.has(pluginId)
}
