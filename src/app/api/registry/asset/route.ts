// src/app/api/registry/asset/route.ts
// 代理插件静态资源（WC JS / CSS）
// 优先从 blog-content/installed-plugins/{id}/ 缓存读取，fallback 才请求 blog-plugins
// Token 留服务端，客户端不可见

import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

const TOKEN  = process.env.GITHUB_TOKEN
const REPO   = process.env.GITHUB_THEMES_REPO   ?? 'Jason-purse/blog-plugins'
const BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'
const LOCAL_REGISTRY_URL = process.env.PLUGIN_REGISTRY_URL

// 从路径推断插件 id 和相对路径
// 例：plugins/ui/reading-progress/webcomponent/index.js
//  → id = reading-progress, rel = webcomponent/index.js
function parsePluginPath(path: string): { id: string; rel: string } | null {
  // 格式：plugins/{category}/{id}/{rel...}
  const m = path.match(/^plugins\/[^/]+\/([^/]+)\/(.+)$/)
  if (m) return { id: m[1], rel: m[2] }
  return null
}

function contentType(path: string) {
  if (path.endsWith('.css'))  return 'text/css'
  if (path.endsWith('.js'))   return 'application/javascript'
  if (path.endsWith('.json')) return 'application/json'
  return 'text/plain'
}

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'missing path' }, { status: 400 })
  if (path.includes('..') || path.startsWith('/'))
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })

  const ct = contentType(path)

  // 1. 优先读 blog-content 缓存
  const parsed = parsePluginPath(path)
  if (parsed) {
    const cached = await storage.read(`installed-plugins/${parsed.id}/${parsed.rel}`)
    if (cached) {
      // WC JS 脚本不做浏览器缓存（版本更新需即时生效）；CSS 可短期缓存
      const cc = ct === 'application/javascript' ? 'no-store' : 'public, max-age=3600'
      return new NextResponse(cached, {
        headers: { 'Content-Type': ct, 'Cache-Control': cc, 'X-Asset-Source': 'cache' }
      })
    }
  }

  // 2a. 本地模式 fallback：直接读文件系统，绕过代理
  if (LOCAL_REGISTRY_URL) {
    try {
      const { readFile } = await import('fs/promises')
      const content = await readFile(`${LOCAL_REGISTRY_URL}/${path}`, 'utf-8')
      return new NextResponse(content, {
        headers: { 'Content-Type': ct, 'Cache-Control': 'no-store', 'X-Asset-Source': 'local' }
      })
    } catch {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }
  }

  // 2b. GitHub 模式 fallback
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    {
      headers: { Accept: 'application/vnd.github.v3+json', ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }) },
      next: { revalidate: 300 },
    }
  )
  if (!res.ok) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const data = await res.json()
  const content = Buffer.from(data.content, 'base64').toString('utf-8')

  return new NextResponse(content, {
    headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=300', 'X-Asset-Source': 'origin' }
  })
}

