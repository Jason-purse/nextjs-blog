// src/app/api/admin/revalidate/route.ts
// 客户端倒计时结束后调此接口触发页面缓存失效（debounced 模式插件用）

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { validateToken } from '@/lib/auth'

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

  return NextResponse.json({ success: true, at: Date.now() })
}
