// ============================================================
// Content Contract - 内容元数据标准接口
// ============================================================

/** 文章标准元数据 */
export interface BlogPost {
  // 必需字段
  slug: string
  title: string
  content: string
  date: string
  author: string
  
  // 可选标准字段
  description?: string
  coverImage?: string
  tags?: string[]
  category?: string
  locale?: string
  draft?: boolean
  
  // Transformer Pipeline 扩展
  wordCount?: number
  readTimeMinutes?: number
  toc?: TOCItem[]
  codeBlockCount?: number
  imageCount?: number
  excerpt?: string
  
  // 自定义 frontmatter
  [key: string]: any
}

/** 页面标准元数据 */
export interface BlogPage {
  slug: string
  title: string
  content: string
  template?: string
  [key: string]: any
}

/** 内容类型 */
export type ContentType = 'post' | 'page' | 'plugin-page'

/** 统一内容接口 */
export interface Content {
  type: ContentType
  slug: string
  meta: BlogPost | BlogPage
  content: string
}

/** TOC 项 */
export interface TOCItem {
  id: string
  text: string
  level: number
}

/** 文章过滤条件 */
export interface PostFilter {
  tag?: string
  category?: string
  locale?: string
  draft?: boolean
  limit?: number
  offset?: number
}
