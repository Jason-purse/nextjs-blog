// src/types/plugin.ts

export type RevalidationMode = 'immediate' | 'debounced'

export interface PluginRevalidation {
  mode: RevalidationMode
  debounceSeconds: number
}

// registry.json 里的插件元数据（来自 GitHub）
export interface RegistryPlugin {
  id: string
  name: string
  category: PluginCategory
  tags: string[]
  type: 'plugin'
  verified: boolean
  version: string
  author: string
  downloads: number
  source: string
  description: string
  revalidation: PluginRevalidation
}

export type PluginCategory = 'content' | 'ui' | 'social' | 'analytics' | 'seo'

export const CATEGORY_LABELS: Record<PluginCategory | 'all', string> = {
  all:       '全部',
  content:   '内容增强',
  ui:        '界面增强',
  social:    '社交互动',
  analytics: '数据分析',
  seo:       'SEO',
}

// settings.json 里存的本地已安装记录
export interface InstalledPlugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  verified: boolean
  category: PluginCategory
  enabled: boolean
  installedAt: number
  revalidation: PluginRevalidation   // 可覆盖 registry 默认值
  config: Record<string, unknown>
}
