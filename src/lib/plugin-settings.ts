// src/lib/plugin-settings.ts
// 读取 settings.json 中的插件开关状态（服务端用）

import { storage } from '@/lib/storage'

interface PluginSettings {
  installed: string[]
  config: Record<string, Record<string, unknown>>
}

// 默认启用的核心插件（settings.json 里没配置时的兜底）
const DEFAULT_ENABLED = ['ai-summary', 'giscus-comments', 'reading-progress']
let cache: { data: PluginSettings; ts: number } | null = null
const TTL = 30_000  // 30s 本地缓存，减少 GitHub API 调用

async function getPluginSettings(): Promise<PluginSettings> {
  const now = Date.now()
  if (cache && now - cache.ts < TTL) return cache.data

  try {
    const raw = await storage.read('settings.json')
    const settings = raw ? JSON.parse(raw) : {}
    const data: PluginSettings = {
      installed: settings?.plugins?.installed ?? DEFAULT_ENABLED,
      config:    settings?.plugins?.config    ?? {},
    }
    cache = { data, ts: now }
    return data
  } catch {
    return { installed: [], config: {} }
  }
}

/** 判断某个插件是否已安装（启用） */
export async function isPluginEnabled(pluginId: string): Promise<boolean> {
  const { installed } = await getPluginSettings()
  return installed.includes(pluginId)
}

/** 获取某个插件的配置 */
export async function getPluginConfig(pluginId: string): Promise<Record<string, unknown>> {
  const { config } = await getPluginSettings()
  return config[pluginId] ?? {}
}
