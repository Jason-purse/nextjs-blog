// ============================================================
// Storage Contract - 数据存储分层接口
// ============================================================

/** 数据存储分层 */
export enum StorageLayer {
  CONTENT = 'content',      // posts/ - 博客内容
  MEDIA = 'media',          // media/ - 媒体文件
  PLUGIN_DATA = 'plugin-data', // 插件私有数据
  GLOBAL = 'global',        // 全局数据
  CACHE = 'cache',         // 缓存（可过期）
}

/** 标准存储路径 */
export const StoragePaths = {
  // 内容层
  POST: (slug: string) => `posts/${slug}.mdx`,
  PAGE: (slug: string) => `pages/${slug}.mdx`,
  
  // 插件数据层
  PLUGIN_DATA: (pluginId: string, key: string) => `plugin-data/${pluginId}/${key}.json`,
  PLUGIN_KV: (pluginId: string, key: string) => `plugin-data/${pluginId}/kv/${key}.json`,
  
  // 全局层
  GLOBAL_KV: (key: string) => `plugin-data/_global/${key}.json`,
  SETTINGS: 'settings.json',
  
  // 缓存层
  CACHE: (pluginId: string, key: string) => `cache/${pluginId}/${key}.json`,
} as const

/** 存储操作结果 */
export interface StorageResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/** 统一存储接口 */
export interface IStorage {
  read(layer: StorageLayer, path: string): Promise<string | null>
  write(layer: StorageLayer, path: string, content: string): Promise<StorageResult>
  delete(layer: StorageLayer, path: string): Promise<StorageResult>
  list(layer: StorageLayer, dir: string): Promise<string[]>
  exists(layer: StorageLayer, path: string): Promise<boolean>
}

/** 插件数据访问便捷接口 */
export interface PluginDataAccessor {
  getData<T = any>(key: string): Promise<T | null>
  setData<T = any>(key: string, data: T): Promise<StorageResult>
  deleteData(key: string): Promise<StorageResult>
  getKV<T = Record<string, any>>(key: string): Promise<T>
  setKV<T = Record<string, any>>(key: string, value: T): Promise<StorageResult>
}

/** 内容过滤条件 */
export interface ContentFilter {
  type?: 'post' | 'page' | 'plugin-page'
  tag?: string
  category?: string
  locale?: string
  draft?: boolean
  search?: string
  limit?: number
  offset?: number
}

/** 内容列表结果 */
export interface ContentListResult<T = any> {
  items: T[]
  total: number
  hasMore: boolean
}
