// src/app/api/admin/plugins/route.ts
// 统一插件管理 API（主题也是插件）

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { validateToken } from '@/lib/auth'
import { storage } from '@/lib/storage'
import type { InstalledPlugin, RegistryPlugin, PluginRevalidation } from '@/types/plugin'

const SETTINGS_FILE = 'settings.json'

function checkAuth(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token ? validateToken(token) !== null : false
}

async function getSettings() {
  const raw = await storage.read(SETTINGS_FILE)
  return raw ? JSON.parse(raw) : {}
}

async function saveSettings(s: Record<string, unknown>) {
  await storage.write(SETTINGS_FILE, JSON.stringify(s, null, 2))
}

// 从 settings 取本地 registry，兼容旧格式
function getLocalRegistry(settings: Record<string, unknown>): Record<string, InstalledPlugin> {
  const plugins = settings.plugins as Record<string, unknown> | undefined
  if (!plugins) return {}
  if (plugins.registry && typeof plugins.registry === 'object') {
    return plugins.registry as Record<string, InstalledPlugin>
  }
  // 旧格式迁移
  if (Array.isArray(plugins.installed)) {
    const reg: Record<string, InstalledPlugin> = {}
    for (const id of plugins.installed as string[]) {
      reg[id] = {
        id, name: id, version: '1.0.0', description: '', author: '',
        verified: false, category: 'content', enabled: true,
        installedAt: Date.now(),
        revalidation: { mode: 'immediate', debounceSeconds: 0 },
        config: {},
      }
    }
    return reg
  }
  return {}
}

function getActiveTheme(settings: Record<string, unknown>): string {
  const plugins = settings.plugins as Record<string, unknown> | undefined
  return (plugins?.activeTheme as string) ?? 'theme-editorial'
}

async function fetchRegistry(): Promise<{ plugins: RegistryPlugin[] }> {
  const repo   = process.env.GITHUB_THEMES_REPO ?? 'Jason-purse/blog-themes'
  const branch = process.env.GITHUB_THEMES_BRANCH ?? 'main'
  const token  = process.env.GITHUB_TOKEN
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/registry.json?ref=${branch}`,
    {
      headers: { Accept: 'application/vnd.github.v3+json', ...(token && { Authorization: `Bearer ${token}` }) },
      next: { revalidate: 300 },
    }
  )
  if (!res.ok) return { plugins: [] }
  const data = await res.json()
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
}

function doRevalidate() {
  revalidatePath('/', 'layout')
  revalidatePath('/blog', 'layout')
  revalidatePath('/blog/[slug]', 'page')
}

// ── GET：全量插件视图（registry + 本地安装状态）
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const [ghReg, settings] = await Promise.all([fetchRegistry(), getSettings()])
  const local = getLocalRegistry(settings)
  const activeTheme = getActiveTheme(settings)

  const plugins = ghReg.plugins.map((p: RegistryPlugin) => ({
    ...p,
    installed:   !!local[p.id],
    enabled:     local[p.id]?.enabled ?? false,
    installedAt: local[p.id]?.installedAt,
    revalidation: local[p.id]?.revalidation ?? p.revalidation,
    // 主题专用：是否为当前激活主题
    active: p.category === 'theme' ? activeTheme === p.id : undefined,
  }))

  return NextResponse.json({ plugins, activeTheme })
}

// ── POST：安装 / 卸载
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const { id, action } = await req.json()
  if (!id || !['install', 'uninstall'].includes(action))
    return NextResponse.json({ error: '参数错误' }, { status: 400 })

  const [ghReg, settings] = await Promise.all([fetchRegistry(), getSettings()])
  const local = getLocalRegistry(settings)
  const meta = ghReg.plugins.find(p => p.id === id)

  if (action === 'install') {
    if (!meta) return NextResponse.json({ error: '插件不存在于 registry' }, { status: 404 })
    local[id] = {
      id, name: meta.name, version: meta.version, description: meta.description,
      author: meta.author, verified: meta.verified, category: meta.category,
      enabled: true, installedAt: Date.now(),
      revalidation: meta.revalidation, config: {},
    }
    // 主题安装 → 自动设为激活主题
    if (meta.category === 'theme') {
      if (!settings.plugins) settings.plugins = {}
      ;(settings.plugins as Record<string, unknown>).activeTheme = id
    }
    if (meta.revalidation.mode === 'immediate') doRevalidate()
  } else {
    const wasEnabled = local[id]?.enabled
    const wasActiveTheme = (settings.plugins as Record<string, unknown>)?.activeTheme === id
    delete local[id]
    // 如果卸载的是激活主题，重置为 editorial
    if (wasActiveTheme) {
      ;(settings.plugins as Record<string, unknown>).activeTheme = 'theme-editorial'
    }
    if (wasEnabled) doRevalidate()
  }

  if (!settings.plugins) settings.plugins = {}
  ;(settings.plugins as Record<string, unknown>).registry = local
  delete (settings.plugins as Record<string, unknown>).installed
  await saveSettings(settings)

  return NextResponse.json({
    success: true,
    revalidation: meta?.revalidation ?? { mode: 'immediate', debounceSeconds: 0 },
  })
}

// ── PATCH：启用/停用 + 修改 revalidation + 切换主题
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const { id, enabled, revalidation, activateTheme } = await req.json() as {
    id: string
    enabled?: boolean
    revalidation?: Partial<PluginRevalidation>
    activateTheme?: boolean   // 主题专用：激活此主题
  }
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const settings = await getSettings()
  const local = getLocalRegistry(settings)
  if (!local[id]) return NextResponse.json({ error: '插件未安装' }, { status: 404 })

  const plugin = local[id]

  // 主题激活：互斥，disable 其他主题
  if (activateTheme && plugin.category === 'theme') {
    for (const [pid, p] of Object.entries(local)) {
      if (p.category === 'theme') local[pid].enabled = pid === id
    }
    if (!settings.plugins) settings.plugins = {}
    ;(settings.plugins as Record<string, unknown>).activeTheme = id
    doRevalidate()
  } else {
    if (enabled !== undefined) plugin.enabled = enabled
    if (revalidation) plugin.revalidation = { ...plugin.revalidation, ...revalidation }
    if (enabled !== undefined && plugin.revalidation.mode === 'immediate') doRevalidate()
  }

  if (!settings.plugins) settings.plugins = {}
  ;(settings.plugins as Record<string, unknown>).registry = local
  await saveSettings(settings)

  return NextResponse.json({ success: true, plugin: local[id] })
}
