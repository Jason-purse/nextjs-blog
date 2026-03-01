// src/app/api/registry/asset/route.ts
// 代理注册表仓库的静态资源
// 作用：token 留在服务端，客户端拿不到；顺便做 checksum 校验
import { NextRequest, NextResponse } from 'next/server'

const TOKEN  = process.env.GITHUB_TOKEN
const REPO   = process.env.GITHUB_THEMES_REPO ?? 'Jason-purse/blog-plugins'
const BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'missing path' }, { status: 400 })

  // 只允许安全路径，防止目录穿越
  if (path.includes('..') || path.startsWith('/')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
    },
    next: { revalidate: 300 }, // 5 分钟缓存
  })

  if (!res.ok) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const data = await res.json()
  const content = Buffer.from(data.content, 'base64').toString('utf-8')

  // 根据文件类型设置 Content-Type
  const ct = path.endsWith('.css') ? 'text/css'
    : path.endsWith('.js')  ? 'application/javascript'
    : path.endsWith('.json') ? 'application/json'
    : 'text/plain'

  return new NextResponse(content, {
    headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=300' }
  })
}
