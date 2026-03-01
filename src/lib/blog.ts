// ============================================================
// Blog Library - Pipeline 架构集成层
// 对外 API 保持不变，内部接入 ContentPipeline
// SOURCE → PARSER → TRANSFORMER → EMITTER
// ============================================================

import readingTime from 'reading-time'
import { ContentPipeline } from '@/lib/pipeline/engine'
import type { ContentNode } from '@/types/pipeline'
import { contentPipelineConfig } from '@/lib/content-pipeline.config'

// ============================================================
// 对外类型（与之前完全一致）
// ============================================================

export interface PostMeta {
  slug: string
  title: string
  date: string
  description: string
  tags: string[]
  category?: string
  coverImage?: string
  author?: string
  readingTime?: string
  summary?: string
  wordCount?: number
  readTimeMinutes?: number
  toc?: Array<{ id: string; text: string; level: number }>
  codeBlockCount?: number
  imageCount?: number
  excerpt?: string
}

export interface Post extends PostMeta {
  content: string
  renderInjections?: string
}

// ============================================================
// Pipeline 单例（模块级缓存，避免重复初始化）
// ============================================================

let _nodesCache: ContentNode[] | null = null
let _cachePromise: Promise<ContentNode[]> | null = null

async function getNodes(): Promise<ContentNode[]> {
  if (_nodesCache) return _nodesCache

  // 防并发：多个请求同时触发时只跑一次 pipeline
  if (_cachePromise) return _cachePromise

  _cachePromise = (async () => {
    const defaultLogger = {
      info: (msg: string) => console.log(`[Blog Pipeline] ${msg}`),
      warn: (msg: string) => console.warn(`[Blog Pipeline] ${msg}`),
      error: (msg: string, err?: Error) => console.error(`[Blog Pipeline] ${msg}`, err),
      debug: (msg: string) => console.debug(`[Blog Pipeline] ${msg}`),
    }

    const defaultCache = new Map<string, unknown>()

    const context = {
      logger: defaultLogger,
      config: contentPipelineConfig as any,
      cache: {
        get: (key: string) => defaultCache.get(key),
        set: (key: string, value: unknown) => defaultCache.set(key, value),
        delete: (key: string) => defaultCache.delete(key),
      },
      getNode: () => undefined as ContentNode | undefined,
      getAllNodes: () => [] as ContentNode[],
    }

    const pipeline = new ContentPipeline(contentPipelineConfig as any, context)
    const nodes = await pipeline.run()
    _nodesCache = nodes
    _cachePromise = null
    return nodes
  })()

  return _cachePromise
}

// ============================================================
// ContentNode → PostMeta / Post 转换
// ============================================================

function nodeToMeta(node: ContentNode): PostMeta {
  const fm = node.frontmatter
  const stats = readingTime(node.body)

  return {
    slug: node.slug,
    title: (fm.title as string) || node.slug,
    date: (fm.date as string) || new Date().toISOString(),
    description: (fm.description as string) || node.excerpt || '',
    tags: (fm.tags as string[]) || [],
    category: fm.category as string | undefined,
    coverImage: fm.coverImage as string | undefined,
    author: fm.author as string | undefined,
    summary: fm.summary as string | undefined,
    readingTime: stats.text,
    wordCount: Math.floor(stats.words),
    readTimeMinutes: Math.ceil(stats.minutes),
    toc: node.toc?.map(t => ({ id: t.id, text: t.text, level: t.depth })),
    excerpt: node.excerpt,
  }
}

function nodeToPost(node: ContentNode): Post {
  return {
    ...nodeToMeta(node),
    content: node.body,
  }
}

// ============================================================
// 公开 API（签名与之前完全一致）
// ============================================================

export async function getPostSlugs(): Promise<string[]> {
  const nodes = await getNodes()
  return nodes.map(n => n.slug)
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const nodes = await getNodes()
  const node = nodes.find(n => n.slug === slug)
  if (!node) throw new Error(`Post not found: ${slug}`)
  return nodeToPost(node)
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const nodes = await getNodes()
  return nodes
    .map(nodeToMeta)
    .sort((a, b) => (a.date > b.date ? -1 : 1))
}

export async function getFeaturedPosts(count = 3): Promise<PostMeta[]> {
  const posts = await getAllPosts()
  return posts.slice(0, count)
}

export async function getPostsByTag(tag: string): Promise<PostMeta[]> {
  const posts = await getAllPosts()
  return posts.filter(p => p.tags.includes(tag))
}

export async function getAllTags(): Promise<string[]> {
  const posts = await getAllPosts()
  const tags = new Set<string>()
  posts.forEach(p => p.tags.forEach(t => tags.add(t)))
  return Array.from(tags).sort()
}

export async function getAllCategories(): Promise<string[]> {
  const posts = await getAllPosts()
  const cats = new Set<string>()
  posts.forEach(p => { if (p.category) cats.add(p.category) })
  return Array.from(cats).sort()
}

export async function getPostsByCategory(category: string): Promise<PostMeta[]> {
  const posts = await getAllPosts()
  return posts.filter(p => p.category === category)
}

export async function getCategoryPostCount(category: string): Promise<number> {
  const posts = await getAllPosts()
  return posts.filter(p => p.category === category).length
}
