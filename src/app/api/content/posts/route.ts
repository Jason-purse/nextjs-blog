// ============================================================
// Posts API - 文章列表接口
// GET /api/content/posts - 列出所有文章（支持过滤、分页）
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import matter from 'gray-matter'
import readingTime from 'reading-time'

interface PostMeta {
  slug: string
  title: string
  date: string
  description: string
  tags: string[]
  category?: string
  coverImage?: string
  author?: string
  readingTime?: string
  wordCount?: number
  readTimeMinutes?: number
}

async function parsePost(slug: string, raw: string): Promise<PostMeta> {
  const { data, content } = matter(raw)
  const stats = readingTime(content)
  const cn = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (content.replace(/[\u4e00-\u9fa5]/g, '').match(/[a-zA-Z0-9]+/g) || []).length
  const wordCount = cn + en
  
  return {
    slug,
    title: data.title || '',
    date: data.date || '',
    description: data.description || '',
    tags: data.tags || [],
    category: data.category,
    coverImage: data.coverImage,
    author: data.author || 'AI Blogger',
    readingTime: stats.text,
    wordCount,
    readTimeMinutes: Math.max(1, Math.ceil(wordCount / 250)),
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tag = searchParams.get('tag') || undefined
  const category = searchParams.get('category') || undefined
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const search = searchParams.get('search') || undefined
  
  // 列出所有 posts
  const files = await storage.list('posts')
  const mdxFiles = files.filter(f => f.endsWith('.mdx'))
  
  // 并行解析所有文章
  const posts = await Promise.all(
    mdxFiles.map(async (file) => {
      const slug = file.replace(/\.mdx$/, '')
      const raw = await storage.read(`posts/${file}`)
      if (!raw) return null
      return parsePost(slug, raw)
    })
  )
  
  // 过滤
  let filtered = posts.filter((p): p is PostMeta => p !== null)
  
  if (tag) {
    filtered = filtered.filter(p => p.tags.includes(tag))
  }
  if (category) {
    filtered = filtered.filter(p => p.category === category)
  }
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q)
    )
  }
  
  // 排序（按日期倒序）
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  // 分页
  const total = filtered.length
  const items = filtered.slice(offset, offset + limit)
  const hasMore = offset + limit < total
  
  return NextResponse.json({
    items,
    total,
    hasMore,
    limit,
    offset
  })
}
