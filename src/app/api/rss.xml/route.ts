// RSS Feed API - /rss.xml
import { NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import matter from 'gray-matter'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nextjs-blog-rose-omega-77.vercel.app'
const SITE_TITLE = process.env.NEXT_PUBLIC_SITE_TITLE || 'AI Blog'
const SITE_DESC = process.env.NEXT_PUBLIC_SITE_DESC || 'A minimalist blog with AI features'

export async function GET() {
  const files = await storage.list('posts')
  const mdxFiles = files.filter(f => f.endsWith('.mdx'))
  
  const posts = await Promise.all(
    mdxFiles.map(async (file) => {
      const slug = file.replace(/\.mdx$/, '')
      const raw = await storage.read(`posts/${file}`)
      if (!raw) return null
      const { data, content } = matter(raw)
      // 简单提取摘要
      const excerpt = content.slice(0, 200).replace(/[#*`\n]/g, ' ').trim() + '...'
      return {
        slug,
        title: data.title || slug,
        date: data.date || new Date().toISOString(),
        description: data.description || excerpt,
        tags: data.tags || []
      }
    })
  )
  
  const validPosts = posts.filter(Boolean).sort((a, b) => 
    new Date(b!.date).getTime() - new Date(a!.date).getTime()
  ).slice(0, 20)
  
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${SITE_TITLE}]]></title>
    <link>${SITE_URL}</link>
    <description><![CDATA[${SITE_DESC}]]></description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${validPosts.map(p => `
    <item>
      <title><![CDATA[${p!.title}]]></title>
      <link>${SITE_URL}/blog/${p!.slug}</link>
      <guid>${SITE_URL}/blog/${p!.slug}</guid>
      <pubDate>${new Date(p!.date).toUTCString()}</pubDate>
      <description><![CDATA[${p!.description}]]></description>
      ${p!.tags.map(t => `<category>${t}</category>`).join('\n      ')}
    </item>
    `).join('')}
  </channel>
</rss>`

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
