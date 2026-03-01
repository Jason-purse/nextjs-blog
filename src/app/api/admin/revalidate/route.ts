// src/app/api/admin/revalidate/route.ts
// 客户端倒计时结束后调此接口触发页面重建

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { validateToken } from '@/lib/auth'

function checkAuth(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token ? validateToken(token) !== null : false
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const { paths } = await req.json().catch(() => ({ paths: [] }))

  // 默认 revalidate 所有博客页面
  const targets: string[] = paths?.length ? paths : ['/blog', '/blog/[slug]']

  for (const p of targets) {
    revalidatePath(p, 'page')
  }
  revalidatePath('/blog', 'layout')

  return NextResponse.json({ success: true, revalidated: targets, at: Date.now() })
}
