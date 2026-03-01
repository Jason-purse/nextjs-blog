// ============================================================
// Content API - 统一内容接口
// GET /api/content/posts - 列出文章
// GET /api/content/post/{slug} - 获取单篇文章
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
  [key: string]: any
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
    ...data
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; slug: string }> }
) {
  const { type, slug } = await params
  
  if (type !== 'post' && type !== 'page') {
    return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
  }
  
  const dir = type === 'post' ? 'posts' : 'pages'
  const ext = type === 'post' ? '.mdx' : '.md'
  
  const raw = await storage.read(`${dir}/${slug}${ext}`)
  if (!raw) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  
  const meta = await parsePost(slug, raw)
  
  return NextResponse.json({
    type,
    slug,
    meta,
    // 原始 MDX 内容（可选，按需返回）
    content: type === 'post' ? undefined : raw
  })
}
