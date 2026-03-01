import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { validateToken } from '@/lib/auth'
import { prewarmAllPosts } from '@/lib/prewarm'

function checkAuth(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token ? validateToken(token) !== null : false
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })

  revalidatePath('/blog', 'layout')
  revalidatePath('/blog', 'page')
  revalidatePath('/blog/[slug]', 'page')
  revalidatePath('/', 'page')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    ?? `https://${req.headers.get('host')}`

  after(async () => {
    await prewarmAllPosts(baseUrl)
  })

  return NextResponse.json({
    success: true,
    at: Date.now(),
    message: '缓存已失效，正在后台预热页面',
  })
}
