// src/types/plugin.ts

// ── 插件配置 Schema ──────────────────────────────────────────────

export type ConfigFieldType = 'color' | 'range' | 'select' | 'text' | 'number' | 'toggle'

interface ConfigFieldBase {
  type: ConfigFieldType
  label: string
  cssVar?: string   // 注入为 CSS 变量，如 --rp-color
  attr?: string     // 注入为 WC attribute
}
interface ColorField    extends ConfigFieldBase { type: 'color';  default: string }
interface RangeField    extends ConfigFieldBase { type: 'range';  default: number; min: number; max: number; unit?: string }
interface SelectField   extends ConfigFieldBase { type: 'select'; default: string; options: { value: string; label: string }[] }
interface TextField     extends ConfigFieldBase { type: 'text';   default: string; placeholder?: string }
interface NumberField   extends ConfigFieldBase { type: 'number'; default: number; min?: number; max?: number }
interface ToggleField   extends ConfigFieldBase { type: 'toggle'; default: boolean }

export type ConfigField = ColorField | RangeField | SelectField | TextField | NumberField | ToggleField

export type ConfigSchema = Record<string, ConfigField>

// plugin.json 中的 config 节
export interface PluginConfigSpec {
  schema: ConfigSchema
}

export type RevalidationMode = 'immediate' | 'debounced'

export interface PluginRevalidation {
  mode: RevalidationMode
  debounceSeconds: number
}

// 所有分类，theme 是特殊分类（互斥激活）
export type PluginCategory = 'theme' | 'content' | 'ui' | 'social' | 'analytics' | 'seo'

export const CATEGORY_META: Record<PluginCategory, { label: string; icon: string; desc: string; mutex?: boolean }> = {
  theme:     { label: '主题',     icon: '🎨', desc: '博客外观主题，同时只能启用一个', mutex: true },
  content:   { label: '内容增强', icon: '✍️', desc: '增强文章内容展示体验' },
  ui:        { label: '界面增强', icon: '🖼️', desc: '优化页面交互与视觉细节' },
  social:    { label: '社交互动', icon: '💬', desc: '评论、分享、互动功能' },
  analytics: { label: '数据分析', icon: '📊', desc: '阅读统计与用户行为分析' },
  seo:       { label: 'SEO 优化', icon: '🔍', desc: '提升搜索引擎收录与排名' },
}

// 来自 GitHub registry.json 的插件元数据
export interface RegistryPlugin {
  id: string
  name: string
  category: PluginCategory
  tags: string[]
  verified: boolean
  version: string
  author: string
  downloads: number
  source: string
  description: string
  longDescription?: string      // 详细描述（markdown）
  icon?: string                 // emoji 或 SVG 字符串
  authorInfo?: { name: string; url?: string }  // 作者信息
  comingSoon?: boolean          // 即将推出标记
  preview?: string              // 主题专用预览图
  revalidation: PluginRevalidation
}

// settings.json 本地已安装记录
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
  revalidation: PluginRevalidation
  config: Record<string, unknown>
  assetsCached?: boolean   // 资源是否已缓存到 blog-content/installed-plugins/{id}/
}

// API 返回的合并视图
export interface PluginView extends RegistryPlugin {
  installed: boolean
  enabled: boolean
  installedAt?: number
  active?: boolean    // 主题专用：是否为当前激活主题
}
