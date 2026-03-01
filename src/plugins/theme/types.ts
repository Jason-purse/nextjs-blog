// src/plugins/theme/types.ts
// Theme Plugin 专属类型定义

export interface FontConfig {
  family: string
  var: string                          // CSS 变量名，如 --font-heading
  weights?: string[]
  styles?: string[]
}

export interface ThemePreset {
  id: string
  label: string
  icon: string
  description: string
  /** CSS 变量键值对，直接注入 [data-theme="xxx"] */
  vars: Record<string, string>
  /** 字体配置，由 ThemePlugin 统一处理加载 */
  fonts?: FontConfig[]
  /** body 级别的额外样式覆盖（如 line-height、letter-spacing） */
  bodyOverrides?: Record<string, string>
}

export interface ThemePluginConfig {
  themes: ThemePreset[]
  default: string
  /** localStorage 存储的 key，默认 'blog-theme' */
  storageKey?: string
}
