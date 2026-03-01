// ============================================================
// Plugin Types - Input/Transformer/Output 架构
// ============================================================

/** 插件类型 */
export type PluginType = 'source' | 'transform' | 'output' | 'ui' | 'page'

/** 插件基接口 */
export interface Plugin {
  id: string
  name: string
  version: string
  type: PluginType
  description?: string
  author?: { name: string; url?: string }
  tags?: string[]
  verified?: boolean
  source?: string // 插件源路径
  
  // 格式声明
  formats?: PluginFormats
  
  // 路由和权限
  allowedRoutes?: string[]
  permissions?: PluginPermissions
  
  // 依赖
  dependencies?: {
    required: string[]
    recommended: string[]
  }
  
  // 配置
  config?: {
    schema: Record<string, ConfigField>
  }
  
  // 优先级与互斥组
  // priority: 0=系统内置, 5=主题捆绑, 10=用户自定义
  // 同一 exclusiveGroup 内只有最高优先级的插件生效
  priority?: number
  exclusiveGroup?: string

  // 主题偏好配置：不同主题激活时注入不同 config
  // key = themeId, value = 覆盖的 config 字段
  themeConfig?: Record<string, Record<string, unknown>>

  // 主题兼容性
  themeCompatibility?: {
    optimizedFor?: string[]
    universal?: boolean
  }
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'text' | 'select' | 'color' | 'range' | 'toggle'
  label: string
  min?: number
  max?: number
  default?: any
  required?: boolean
  options?: { label: string; value: any }[]
  cssVar?: string  // CSS 变量名
}

export interface PluginPermissions {
  publicRead?: boolean
  publicWrite?: boolean
  adminWrite?: boolean
  rateLimitMs?: number
}

export interface PluginFormats {
  // Web Component (UI 插件)
  webcomponent?: {
    entry: string
    element: string
    slots?: string[]
  }
  
  // Source 插件 - 数据源
  source?: {
    entry: string
    init?: string
  }
  
  // Transformer 插件 - 数据转换
  transform?: {
    entry: string
    phase?: 'early' | 'middle' | 'late' | 'render'
    hooks?: string[]
  }
  
  // Output 插件 - 输出形式
  output?: {
    entry: string
    contentType?: 'html' | 'json' | 'xml' | 'text'
  }
  
  // Page 插件 - 页面
  page?: {
    route: string
    title: string
    nav?: {
      location?: 'header' | 'footer' | 'sidebar'
      label?: string
      order?: number
    }
  }
  
  // Admin 页面
  adminPage?: {
    entry: string
    element?: string
    nav?: {
      label: string
      icon?: string
      section?: string
    }
  }
  
  // Hook 插件 (兼容旧命名)
  hook?: {
    entry: string
    hooks?: string[]
  }
}

// ============================================================
// Pipeline 类型
// ============================================================

/** Pipeline 输入 */
export interface PipelineInput {
  /** 内容类型 */
  contentType: 'mdx' | 'json' | 'html' | 'text'
  /** 原始内容 */
  content: string
  /** 元数据 */
  metadata: Record<string, any>
  /** 上下文 */
  context: PipelineContext
}

/** Pipeline 上下文 */
export interface PipelineContext {
  slug?: string
  route?: string
  params?: Record<string, string>
  query?: Record<string, string>
  locale?: string
  theme?: string
  plugins?: Record<string, PluginInstance>
}

/** Pipeline 输出 */
export interface PipelineOutput {
  content: string
  metadata: Record<string, any>
  injections: PipelineInjection[]
}

export interface PipelineInjection {
  type: 'head' | 'body' | 'script' | 'style' | 'html'
  content: string
  priority?: number
}

/** Pipeline 阶段 */
export type PipelinePhase = 'source' | 'transform' | 'output'

/** Pipeline 阶段定义 */
export interface PipelinePhaseConfig {
  phase: PipelinePhase
  plugins: PluginInstance[]
}

/** 插件实例 */
export interface PluginInstance {
  id: string
  plugin: Plugin
  config?: Record<string, any>
  enabled?: boolean
}

/** Transformer 函数签名 */
export interface TransformerFunc {
  (input: PipelineInput): Promise<PipelineInput>
  (input: PipelineInput): PipelineInput
}

/** Source 函数签名 */
export interface SourceFunc {
  (context: PipelineContext): Promise<PipelineInput>
}

/** Output 函数签名 */
export interface OutputFunc {
  (input: PipelineOutput): Promise<PipelineOutput>
}

export type ConfigSchema = Record<string, ConfigField>

export type PluginCategory = 'source' | 'transform' | 'output' | 'theme' | 'ui' | 'content' | 'social' | 'analytics' | 'page' | 'seo' | 'hook'


export interface PluginView {
  id: string
  name: string
  icon?: string
  description?: string
  longDescription?: string
  author?: string | { name: string; url?: string }
  tags: string[]
  source: string
  category: PluginCategory
  version: string
  verified: boolean
  enabled?: boolean
  config?: Record<string, any>
  comingSoon?: boolean
  downloads?: number
  installed?: boolean
  installedAt?: string
  dependencies?: PluginDependencies
  revalidation?: PluginRevalidation
}

export type RevalidationMode = 'immediate' | 'debounced' | 'delayed' | 'scheduled'

export interface PluginRevalidation {
  mode: RevalidationMode
  debounceSeconds?: number
  tags?: string[]
  path?: string
  delayMs?: number
  scheduleCron?: string
}

export interface PluginDependencies {
  required?: string[]
  recommended?: string[]
}

export interface InstalledPlugin extends PluginView {
  assetsCached?: boolean
}

export interface RegistryPlugin extends PluginView {
  // Registry-specific fields
}
