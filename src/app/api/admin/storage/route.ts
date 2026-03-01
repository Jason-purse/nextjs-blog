// src/app/api/admin/storage/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth'

function checkAuth(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token ? validateToken(token) !== null : false
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const repo   = process.env.GITHUB_CONTENT_REPO
  const branch = process.env.GITHUB_CONTENT_BRANCH ?? 'main'
  const token  = process.env.GITHUB_TOKEN

  if (!repo) return NextResponse.json({ stats: { postsCount: 0, repo: '未配置', branch }, files: [] })

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/posts?ref=${branch}`,
      { headers: { Accept: 'application/vnd.github.v3+json', ...(token && { Authorization: `Bearer ${token}` }) }, cache: 'no-store' }
    )
    if (!res.ok) return NextResponse.json({ stats: { postsCount: 0, repo, branch }, files: [] })

    const files: Array<{ name: string; path: string; size: number; type: string; sha: string }> = await res.json()
    const posts = files.filter(f => f.name.match(/\.(md|mdx)$/))

    return NextResponse.json({
      stats: { postsCount: posts.length, repo, branch, lastUpdated: new Date().toISOString() },
      files: files.map(f => ({ name: f.name, path: f.path, size: f.size, type: f.type, sha: f.sha })),
    })
  } catch {
    return NextResponse.json({ stats: { postsCount: 0, repo, branch }, files: [] })
  }
}
