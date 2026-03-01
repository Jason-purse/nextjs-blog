export interface BlogTOCItem {
  id: string
  text: string
  level: number
}

export interface BlogContentContext {
  slug: string
  title: string
  tags: string[]
  category: string
  wordCount: number
  readTimeMins: number
  publishedAt: string
  toc: BlogTOCItem[]
}

export interface BlogThemeContext {
  id: string
  name: string
}

export interface BlogRouteContext {
  pathname: string
  type: 'home' | 'article' | 'category' | 'tag' | 'page' | 'admin' | 'other'
}

export interface BlogPlatformContext {
  theme: BlogThemeContext
  route: BlogRouteContext
  darkMode: boolean
  locale: string
}

export interface BlogPluginEntry {
  config: Record<string, unknown>
  api?: Record<string, (...args: unknown[]) => unknown>
}

export interface BlogPluginContext {
  platform: BlogPlatformContext
  content?: BlogContentContext
  plugins: Record<string, BlogPluginEntry>
  emit: (event: string, data?: unknown) => void
  on: (event: string, handler: (data: unknown) => void) => void
  off: (event: string, handler: (data: unknown) => void) => void
}

declare global {
  interface Window {
    __BLOG_CTX__: BlogPluginContext
    __BLOG_PLUGIN_CONFIG__: Record<string, Record<string, unknown>>
    __BLOG_CONTENT_CTX__?: BlogContentContext
  }
}

export {}
