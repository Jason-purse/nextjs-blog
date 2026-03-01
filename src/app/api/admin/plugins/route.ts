// src/app/api/admin/plugins/route.ts
// 统一插件管理 API（主题也是插件）
// 安装时将插件资源缓存到 blog-content/installed-plugins/{id}/，Runtime 从缓存读取

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { validateToken } from '@/lib/auth'
import { storage } from '@/lib/storage'
import type { InstalledPlugin, RegistryPlugin, PluginRevalidation } from '@/types/plugin'

const SETTINGS_FILE    = 'settings.json'
const PLUGINS_REPO     = process.env.GITHUB_THEMES_REPO   ?? 'Jason-purse/blog-plugins'
const PLUGINS_BRANCH   = process.env.GITHUB_THEMES_BRANCH ?? 'main'
const GITHUB_TOKEN     = process.env.GITHUB_TOKEN

const GH_HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  ...(GITHUB_TOKEN && { Authorization: `Bearer ${GITHUB_TOKEN}` }),
}

// ── 工具函数 ───────────────────────────────────────────────────────

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

async function fetchPluginsRegistry(): Promise<{ plugins: RegistryPlugin[] }> {
  const res = await fetch(
    `https://api.github.com/repos/${PLUGINS_REPO}/contents/registry.json?ref=${PLUGINS_BRANCH}`,
    { headers: GH_HEADERS, next: { revalidate: 300 } }
  )
  if (!res.ok) return { plugins: [] }
  const data = await res.json()
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
}

// 从 blog-plugins repo 下载单个文件内容（raw string）
async function downloadPluginFile(path: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${PLUGINS_REPO}/contents/${path}?ref=${PLUGINS_BRANCH}`,
      { headers: GH_HEADERS }
    )
    if (!res.ok) return null
    const data = await res.json()
    return Buffer.from(data.content, 'base64').toString('utf-8')
  } catch { return null }
}

// 安装时：将插件所有资源缓存到 blog-content/installed-plugins/{id}/
// 目录结构：installed-plugins/{id}/plugin.json + css/ + webcomponent/
async function cachePluginAssets(id: string, source: string): Promise<boolean> {
  try {
    // 1. 拉取 plugin.json
    const manifestRaw = await downloadPluginFile(`${source}/plugin.json`)
    if (!manifestRaw) return false
    const manifest = JSON.parse(manifestRaw)

    // 2. 保存 plugin.json 到 blog-content
    await storage.write(
      `installed-plugins/${id}/plugin.json`,
      manifestRaw,
      `plugin: install ${id} — cache plugin.json`
    )

    // 3. 下载 CSS 文件
    const cssEntry = manifest?.formats?.css?.entry as string | undefined
    if (cssEntry) {
      const css = await downloadPluginFile(`${source}/${cssEntry}`)
      if (css) {
        await storage.write(
          `installed-plugins/${id}/${cssEntry}`,
          css,
          `plugin: install ${id} — cache ${cssEntry}`
        )
      }
    }

    // 4. 下载 WebComponent JS
    const wcEntry = manifest?.formats?.webcomponent?.entry as string | undefined
    if (wcEntry) {
      const js = await downloadPluginFile(`${source}/${wcEntry}`)
      if (js) {
        await storage.write(
          `installed-plugins/${id}/${wcEntry}`,
          js,
          `plugin: install ${id} — cache ${wcEntry}`
        )
      }
    }

    return true
  } catch (e) {
    console.error(`[plugin] cachePluginAssets failed for ${id}:`, e)
    return false
  }
}

// 卸载时：清理 blog-content/installed-plugins/{id}/ 下的文件
async function removePluginAssets(id: string): Promise<void> {
  // 读 plugin.json 知道有哪些文件
  try {
    const manifestRaw = await storage.read(`installed-plugins/${id}/plugin.json`)
    if (!manifestRaw) return
    const manifest = JSON.parse(manifestRaw)

    const filesToDelete: string[] = [`installed-plugins/${id}/plugin.json`]
    const cssEntry = manifest?.formats?.css?.entry as string | undefined
    if (cssEntry) filesToDelete.push(`installed-plugins/${id}/${cssEntry}`)
    const wcEntry = manifest?.formats?.webcomponent?.entry as string | undefined
    if (wcEntry) filesToDelete.push(`installed-plugins/${id}/${wcEntry}`)

    for (const f of filesToDelete) {
      try { await storage.delete(f, `plugin: uninstall ${id} — remove ${f}`) } catch {}
    }
  } catch {}
}

function doRevalidate() {
  revalidatePath('/', 'layout')
  revalidatePath('/blog', 'layout')
  revalidatePath('/blog/[slug]', 'page')
}

// ── GET ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const [ghReg, settings] = await Promise.all([fetchPluginsRegistry(), getSettings()])
  const local = getLocalRegistry(settings)
  const activeTheme = getActiveTheme(settings)

  const plugins = ghReg.plugins.map((p: RegistryPlugin) => ({
    ...p,
    installed:    !!local[p.id],
    enabled:      local[p.id]?.enabled ?? false,
    installedAt:  local[p.id]?.installedAt,
    revalidation: local[p.id]?.revalidation ?? p.revalidation,
    assetsCached: local[p.id]?.assetsCached ?? false,
    active: p.category === 'theme' ? activeTheme === p.id : undefined,
  }))

  return NextResponse.json({ plugins, activeTheme })
}

// ── POST：安装 / 卸载 ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const { id, action } = await req.json()
  if (!id || !['install', 'uninstall'].includes(action))
    return NextResponse.json({ error: '参数错误' }, { status: 400 })

  const [ghReg, settings] = await Promise.all([fetchPluginsRegistry(), getSettings()])
  const local = getLocalRegistry(settings)
  const meta = ghReg.plugins.find((p: RegistryPlugin) => p.id === id)

  if (action === 'install') {
    if (!meta) return NextResponse.json({ error: '插件不存在于 registry' }, { status: 404 })

    // 下载并缓存资源到 blog-content/installed-plugins/{id}/
    const cached = await cachePluginAssets(id, meta.source)

    local[id] = {
      id, name: meta.name, version: meta.version, description: meta.description,
      author: meta.author, verified: meta.verified, category: meta.category,
      enabled: true, installedAt: Date.now(),
      revalidation: meta.revalidation,
      config: {},
      assetsCached: cached,  // 标记资源是否已缓存
    } as InstalledPlugin & { assetsCached: boolean }

    // 主题安装 → 自动激活
    if (meta.category === 'theme') {
      if (!settings.plugins) settings.plugins = {}
      ;(settings.plugins as Record<string, unknown>).activeTheme = id
    }
    if (meta.revalidation.mode === 'immediate') doRevalidate()

  } else {
    // 卸载：先清理缓存资源
    await removePluginAssets(id)
    const wasEnabled = local[id]?.enabled
    const wasActiveTheme = (settings.plugins as Record<string, unknown>)?.activeTheme === id
    delete local[id]
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

// ── PATCH：启用/停用 + revalidation + 主题激活 ───────────────────

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const { id, enabled, revalidation, activateTheme, config } = await req.json() as {
    id: string
    enabled?: boolean
    revalidation?: Partial<PluginRevalidation>
    activateTheme?: boolean
    config?: Record<string, unknown>
  }
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const settings = await getSettings()
  const local = getLocalRegistry(settings)
  if (!local[id]) return NextResponse.json({ error: '插件未安装' }, { status: 404 })

  const plugin = local[id]

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
    if (config !== undefined) plugin.config = config
    if (enabled !== undefined && plugin.revalidation.mode === 'immediate') doRevalidate()
  }

  if (!settings.plugins) settings.plugins = {}
  ;(settings.plugins as Record<string, unknown>).registry = local
  await saveSettings(settings)

  return NextResponse.json({ success: true, plugin: local[id] })
}
