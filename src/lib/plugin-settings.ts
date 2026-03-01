// src/lib/plugin-settings.ts
// 服务端读取插件启用状态（兼容新旧 schema）

import { storage } from '@/lib/storage'

const DEFAULT_ENABLED = new Set(['ai-summary', 'giscus-comments', 'reading-progress'])
const DEFAULT_THEME   = 'theme-editorial'

interface CacheEntry { enabled: Set<string>; activeTheme: string; ts: number }
let cache: CacheEntry | null = null
const TTL = 30_000

async function load(): Promise<CacheEntry> {
  const now = Date.now()
  if (cache && now - cache.ts < TTL) return cache

  try {
    const raw = await storage.read('settings.json')
    const settings = raw ? JSON.parse(raw) : {}
    const plugins = settings?.plugins ?? {}

    let enabled: string[]
    let activeTheme = DEFAULT_THEME

    if (plugins.registry && typeof plugins.registry === 'object') {
      // 新格式
      const reg = plugins.registry as Record<string, { enabled: boolean; id: string; category: string }>
      enabled = Object.values(reg).filter(p => p.enabled).map(p => p.id)
      activeTheme = (plugins.activeTheme as string) ?? DEFAULT_THEME
    } else if (Array.isArray(plugins.installed)) {
      // 旧格式
      enabled = plugins.installed as string[]
      activeTheme = (plugins.theme as string) ?? DEFAULT_THEME
    } else {
      enabled = [...DEFAULT_ENABLED]
    }

    const entry: CacheEntry = {
      enabled: new Set(enabled),
      activeTheme,
      ts: now,
    }
    cache = entry
    return entry
  } catch {
    return { enabled: DEFAULT_ENABLED, activeTheme: DEFAULT_THEME, ts: now }
  }
}

export async function isPluginEnabled(pluginId: string): Promise<boolean> {
  const { enabled } = await load()
  return enabled.has(pluginId)
}

export async function getActiveTheme(): Promise<string> {
  const { activeTheme } = await load()
  return activeTheme
}
