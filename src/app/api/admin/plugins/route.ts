// src/app/api/admin/plugins/route.ts

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

// 兼容旧格式 installed: string[]  →  新格式 registry: Record<id, InstalledPlugin>
function getRegistry(settings: Record<string, unknown>): Record<string, InstalledPlugin> {
  const plugins = settings.plugins as Record<string, unknown> | undefined
  if (!plugins) return {}
  // 新格式
  if (plugins.registry && typeof plugins.registry === 'object') {
    return plugins.registry as Record<string, InstalledPlugin>
  }
  // 旧格式迁移：只有 id，补默认值
  if (Array.isArray(plugins.installed)) {
    const reg: Record<string, InstalledPlugin> = {}
    for (const id of plugins.installed as string[]) {
      reg[id] = {
        id, name: id, version: '1.0.0', description: '', author: '',
        verified: false, category: 'content', enabled: true,
        installedAt: Date.now(), revalidation: { mode: 'immediate', debounceSeconds: 0 }, config: {},
      }
    }
    return reg
  }
  return {}
}

async function fetchRegistry(): Promise<{ themes: unknown[]; plugins: RegistryPlugin[] }> {
  const repo   = process.env.GITHUB_THEMES_REPO ?? 'Jason-purse/blog-themes'
  const branch = process.env.GITHUB_THEMES_BRANCH ?? 'main'
  const token  = process.env.GITHUB_TOKEN
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/registry.json?ref=${branch}`,
    { headers: { Accept: 'application/vnd.github.v3+json', ...(token && { Authorization: `Bearer ${token}` }) }, next: { revalidate: 300 } }
  )
  if (!res.ok) return { themes: [], plugins: [] }
  const data = await res.json()
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
}

function doRevalidate() {
  revalidatePath('/blog', 'layout')
  revalidatePath('/blog', 'page')
  revalidatePath('/blog/[slug]', 'page')
  revalidatePath('/', 'page')
}

// ── GET：市场列表 + 已安装状态
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const [ghRegistry, settings] = await Promise.all([fetchRegistry(), getSettings()])
  const localRegistry = getRegistry(settings)

  const plugins = ghRegistry.plugins.map((p: RegistryPlugin) => ({
    ...p,
    installed: !!localRegistry[p.id],
    enabled:   localRegistry[p.id]?.enabled ?? false,
    installedAt: localRegistry[p.id]?.installedAt,
    // 用本地覆盖过的 revalidation（如果有）
    revalidation: localRegistry[p.id]?.revalidation ?? p.revalidation,
  }))

  const installed = Object.values(localRegistry)

  const themes = (ghRegistry.themes as Record<string, unknown>[]).map(t => ({
    ...t,
    active: (settings.theme ?? 'editorial') === t.id,
  }))

  return NextResponse.json({ plugins, installed, themes })
}

// ── POST：安装 / 卸载
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const body = await req.json()
  const { id, action } = body  // action: 'install' | 'uninstall'

  if (!id || !['install', 'uninstall'].includes(action))
    return NextResponse.json({ error: '参数错误' }, { status: 400 })

  const [ghRegistry, settings] = await Promise.all([fetchRegistry(), getSettings()])
  const localRegistry = getRegistry(settings)

  if (action === 'install') {
    const meta = ghRegistry.plugins.find(p => p.id === id)
    if (!meta) return NextResponse.json({ error: '插件不存在' }, { status: 404 })
    localRegistry[id] = {
      id, name: meta.name, version: meta.version, description: meta.description,
      author: meta.author, verified: meta.verified, category: meta.category,
      enabled: true, installedAt: Date.now(),
      revalidation: meta.revalidation,
      config: {},
    }
    // 安装且启用 → immediate 立刻 revalidate
    if (meta.revalidation.mode === 'immediate') doRevalidate()
  } else {
    const wasEnabled = localRegistry[id]?.enabled
    delete localRegistry[id]
    if (wasEnabled) doRevalidate()
  }

  if (!settings.plugins) settings.plugins = {}
  ;(settings.plugins as Record<string, unknown>).registry = localRegistry
  // 清掉旧的 installed 字段
  delete (settings.plugins as Record<string, unknown>).installed
  await saveSettings(settings)

  return NextResponse.json({
    success: true,
    revalidation: action === 'install'
      ? ghRegistry.plugins.find(p => p.id === id)?.revalidation
      : { mode: 'immediate', debounceSeconds: 0 },
  })
}

// ── PATCH：更新单个插件（enable/disable / 修改 revalidation）
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const { id, enabled, revalidation } = await req.json() as {
    id: string; enabled?: boolean; revalidation?: Partial<PluginRevalidation>
  }
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const settings = await getSettings()
  const localRegistry = getRegistry(settings)
  if (!localRegistry[id]) return NextResponse.json({ error: '插件未安装' }, { status: 404 })

  const prev = localRegistry[id]
  if (enabled !== undefined) prev.enabled = enabled
  if (revalidation) prev.revalidation = { ...prev.revalidation, ...revalidation }

  if (!settings.plugins) settings.plugins = {}
  ;(settings.plugins as Record<string, unknown>).registry = localRegistry
  await saveSettings(settings)

  // enable/disable 变化 → 按插件策略 revalidate
  if (enabled !== undefined && prev.revalidation.mode === 'immediate') {
    doRevalidate()
  }

  return NextResponse.json({ success: true, plugin: localRegistry[id] })
}
