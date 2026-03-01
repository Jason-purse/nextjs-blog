// Sitemap API - /sitemap.xml
import { NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import matter from 'gray-matter'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nextjs-blog-rose-omega-77.vercel.app'

export async function GET() {
  const files = await storage.list('posts')
  const mdxFiles = files.filter(f => f.endsWith('.mdx'))
  
  const posts = await Promise.all(
    mdxFiles.map(async (file) => {
      const slug = file.replace(/\.mdx$/, '')
      const raw = await storage.read(`posts/${file}`)
      if (!raw) return null
      const { data } = matter(raw)
      return {
        slug,
        date: data.date || new Date().toISOString(),
        title: data.title || slug
      }
    })
  )
  
  const validPosts = posts.filter(Boolean).sort((a, b) => 
    new Date(b!.date).getTime() - new Date(a!.date).getTime()
  )
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ${validPosts.map(p => `
  <url>
    <loc>${SITE_URL}/blog/${p!.slug}</loc>
    <lastmod>${new Date(p!.date).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  `).join('')}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
