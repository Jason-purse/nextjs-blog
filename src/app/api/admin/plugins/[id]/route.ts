// src/app/api/admin/plugins/[id]/route.ts
// 获取单个插件的详情：registry 元数据 + plugin.json schema + 用户 config

import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth'
import { storage } from '@/lib/storage'
import type { ConfigSchema } from '@/types/plugin'

const REPO   = process.env.GITHUB_THEMES_REPO   ?? 'Jason-purse/blog-plugins'
const BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'
const TOKEN  = process.env.GITHUB_TOKEN

const GH_HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
}

function checkAuth(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token ? validateToken(token) !== null : false
}

async function fetchFileContent(path: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
      { headers: GH_HEADERS, next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return Buffer.from(data.content, 'base64').toString('utf-8')
  } catch { return null }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const { id } = await params

  // 1. 读 registry.json 找插件元数据（含 source 路径和完整信息）
  const regRaw = await fetchFileContent('registry.json')
  if (!regRaw) return NextResponse.json({ error: 'registry 读取失败' }, { status: 502 })
  const registry = JSON.parse(regRaw)
  const meta = (registry.plugins as { 
    id: string; 
    source: string; 
    name?: string; 
    icon?: string; 
    author?: { name: string; url?: string }; 
    description?: string; 
    longDescription?: string; 
    tags?: string[]; 
    category?: string; 
    version?: string; 
    verified?: boolean;
    comingSoon?: boolean;
  }[]).find(p => p.id === id)
  if (!meta) return NextResponse.json({ error: '插件不存在' }, { status: 404 })

  // 2. 读 plugin.json 获取 config schema
  const manifestRaw = await fetchFileContent(`${meta.source}/plugin.json`)
  let schema: ConfigSchema = {}
  let schemaDefaults: Record<string, unknown> = {}
  if (manifestRaw) {
    const manifest = JSON.parse(manifestRaw)
    schema = manifest?.config?.schema ?? {}
    // 提取每个字段的 default
    schemaDefaults = Object.fromEntries(
      Object.entries(schema).map(([k, f]) => [k, (f as { default: unknown }).default])
    )
  }

  // 3. 读 settings.json 获取用户已保存的 config 和启用状态
  let userConfig: Record<string, unknown> = {}
  let installed = false
  let enabled = false
  try {
    const raw = await storage.read('settings.json')
    if (raw) {
      const settings = JSON.parse(raw)
      const pluginSettings = settings?.plugins?.registry?.[id]
      if (pluginSettings) {
        userConfig = (pluginSettings.config as Record<string, unknown>) ?? {}
        installed = true
        enabled = pluginSettings.enabled ?? false
      }
    }
  } catch {}

  // 4. 合并：schema 默认值 + 用户覆盖
  const mergedConfig = { ...schemaDefaults, ...userConfig }

  // 5. 构建完整的 plugin 对象（包含 registry 元数据）
  const plugin = {
    id: meta.id,
    name: meta.name || id,
    icon: meta.icon,
    author: meta.author,
    description: meta.description || '',
    longDescription: meta.longDescription,
    tags: meta.tags || [],
    source: meta.source,
    category: meta.category || 'ui',
    version: meta.version || '1.0.0',
    verified: meta.verified ?? false,
    comingSoon: meta.comingSoon,
    installed,
    enabled,
  }

  return NextResponse.json({
    plugin,
    schema,
    schemaDefaults,
    userConfig,
    mergedConfig,
  })
}

// PATCH：保存插件 config
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const { id } = await params
  const { config } = await req.json() as { config: Record<string, unknown> }

  const raw = await storage.read('settings.json')
  const settings = raw ? JSON.parse(raw) : {}
  if (!settings.plugins) settings.plugins = {}
  if (!settings.plugins.registry) settings.plugins.registry = {}
  if (!settings.plugins.registry[id]) settings.plugins.registry[id] = { id, enabled: false }
  settings.plugins.registry[id].config = config

  await storage.write('settings.json', JSON.stringify(settings, null, 2))
  return NextResponse.json({ ok: true, config })
}
