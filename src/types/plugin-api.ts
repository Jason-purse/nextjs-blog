// ============================================================
// Plugin API Contract - 插件间通信标准接口
// ============================================================

/** 插件生命周期钩子 */
export interface PluginLifecycle {
  /** 挂载时调用 */
  onMount?(ctx: PluginContext): void
  /** 卸载时调用 */
  onUnmount?(): void
  /** 路由变化时调用 */
  onRouteChange?(route: string, type: RouteType): void
  /** 配置变化时调用 */
  onConfigChange?(config: Record<string, unknown>): void
}

/** 路由类型 */
export type RouteType = 'home' | 'article' | 'page' | 'category' | 'tag' | 'admin' | 'other'

/** 插件上下文 */
export interface PluginContext {
  id: string
  version: string
  config: Record<string, unknown>
  platform: PlatformContext
}

/** 平台上下文 */
export interface PlatformContext {
  theme: {
    id: string
    name: string
    vars: Record<string, string>
  }
  route: {
    pathname: string
    type: RouteType
  }
  darkMode: boolean
  locale: string
}

/** 插件数据 API */
export interface PluginDataAPI {
  /** 读取数据 */
  getData<T = any>(key: string): Promise<T | null>
  /** 写入数据 */
  setData<T = any>(key: string, data: T): Promise<void>
  /** 删除数据 */
  deleteData(key: string): Promise<void>
  /** 读取 KV */
  getKV<T = Record<string, any>>(key: string): Promise<T>
  /** 写入 KV */
  setKV<T = any>(key: string, value: T): Promise<void>
}

/** 插件事件 API */
export interface PluginEventsAPI {
  /** 发送事件 */
  emit(event: string, data?: any): void
  /** 监听事件 */
  on(event: string, handler: (data: any) => void): void
  /** 取消监听 */
  off(event: string, handler: (data: any) => void): void
}

/** 完整插件 API */
export interface PluginAPI extends PluginLifecycle {
  id: string
  version: string
  config: Record<string, unknown>
  data: PluginDataAPI
  events: PluginEventsAPI
  /** 插件自定义 API */
  [key: string]: any
}

/** 平台 API（注入到 window.__BLOG_PLUGIN_API__） */
export interface PlatformAPI {
  /** 获取文章 */
  getPost(slug: string): Promise<any | null>
  /** 列出文章 */
  listPosts(filter?: any): Promise<any[]>
  /** 获取页面 */
  getPage(slug: string): Promise<any | null>
  
  /** 插件数据访问 */
  pluginData(pluginId: string): PluginDataAPI
  
  /** 全局数据访问 */
  globalData(): PluginDataAPI
  
  /** 事件总线 */
  events: PluginEventsAPI
  
  /** 获取当前上下文 */
  getContext(): PlatformContext
  
  /** 导航 */
  navigate(path: string): void
  
  /** 插件市场 */
  marketplace: {
    install(id: string): Promise<void>
    uninstall(id: string): Promise<void>
    enable(id: string): Promise<void>
    disable(id: string): Promise<void>
  }
}

/** 插件 manifest 扩展 */
export interface PluginManifestExtension {
  /** 数据 Schema */
  dataSchema?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    label: string
    default?: any
    required?: boolean
  }>
  
  /** API 声明 */
  api?: Record<string, {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    path: string
    description?: string
  }>
  
  /** 权限声明 */
  permissions?: {
    publicRead?: boolean
    publicWrite?: boolean
    adminWrite?: boolean
    rateLimitMs?: number
  }
  
  /** 依赖的内容类型 */
  requires?: {
    contentTypes?: ('post' | 'page' | 'plugin-page')[]
    contextFields?: string[]
  }
}

/** 全局声明 */
declare global {
  interface Window {
    __BLOG_PLUGIN_API__: PlatformAPI
  }
}
