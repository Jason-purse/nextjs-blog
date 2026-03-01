// src/app/api/admin/plugins/route.ts
// 插件管理 API：列出注册表插件 + 安装/停用 + 按策略 revalidate

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { validateToken } from '@/lib/auth'
import { storage } from '@/lib/storage'

const SETTINGS_FILE = 'settings.json'

function checkAuth(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token ? validateToken(token) !== null : false
}

async function getSettings() {
  const raw = await storage.read(SETTINGS_FILE)
  return raw ? JSON.parse(raw) : {}
}

async function saveSettings(settings: Record<string, unknown>) {
  await storage.write(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

async function fetchRegistry() {
  const repo   = process.env.GITHUB_THEMES_REPO ?? 'Jason-purse/blog-themes'
  const branch = process.env.GITHUB_THEMES_BRANCH ?? 'main'
  const token  = process.env.GITHUB_TOKEN

  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/registry.json?ref=${branch}`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      next: { revalidate: 300 },
    }
  )
  if (!res.ok) return { themes: [], plugins: [] }
  const data = await res.json()
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
}

// GET：注册表插件列表 + 已安装状态
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const [registry, settings] = await Promise.all([fetchRegistry(), getSettings()])
  const installed: string[] = settings.plugins?.installed ?? []

  const plugins = (registry.plugins ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    installed: installed.includes(p.id as string),
  }))

  const themes = (registry.themes ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    installed: true,
    active: (settings.theme ?? 'editorial') === t.id,
  }))

  return NextResponse.json({ plugins, themes, installed })
}

// POST：安装或停用插件
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const { id, action } = await req.json()
  if (!id || !['install', 'uninstall'].includes(action)) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 })
  }

  // 拿插件 revalidation 策略
  const registry = await fetchRegistry()
  const pluginMeta = (registry.plugins ?? []).find(
    (p: Record<string, unknown>) => p.id === id
  ) as Record<string, unknown> | undefined
  const revalidation = (pluginMeta?.revalidation as Record<string, unknown>) ?? { mode: 'immediate' }

  // 更新 settings
  const settings = await getSettings()
  const installed: string[] = settings.plugins?.installed ?? []
  const next = action === 'install'
    ? [...new Set([...installed, id])]
    : installed.filter((x: string) => x !== id)
  settings.plugins = { ...(settings.plugins ?? {}), installed: next }
  await saveSettings(settings)

  // immediate：直接让缓存失效，下一个真实用户的请求会触发 ISR 重建
  if (revalidation.mode === 'immediate') {
    revalidatePath('/blog', 'layout')
    revalidatePath('/blog', 'page')
    revalidatePath('/blog/[slug]', 'page')
    revalidatePath('/', 'page')
  }
  // debounced：不立刻 revalidate，客户端倒计时结束后调 /api/admin/revalidate

  return NextResponse.json({
    success: true,
    installed: next,
    revalidation: {
      mode: revalidation.mode,
      debounceSeconds: revalidation.mode === 'debounced'
        ? (revalidation.debounceSeconds as number ?? 120)
        : 0,
    },
  })
}
