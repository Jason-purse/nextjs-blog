// src/lib/plugin-registry.ts
// ============================================================
// Plugin / Theme 注册表加载器
// 统一通过 GitHub API 加载，dev/prod 同一路径
// PAT → Jason-purse/blog-plugins → registry.json + 各插件文件
// ============================================================

const REGISTRY_TOKEN  = process.env.GITHUB_TOKEN          // 复用同一个 PAT
const REGISTRY_REPO   = process.env.GITHUB_THEMES_REPO ?? 'Jason-purse/blog-plugins'
const REGISTRY_BRANCH = process.env.GITHUB_THEMES_BRANCH ?? 'main'

const BASE_URL = `https://api.github.com/repos/${REGISTRY_REPO}/contents`
const RAW_URL  = `https://raw.githubusercontent.com/${REGISTRY_REPO}/${REGISTRY_BRANCH}`

const headers: HeadersInit = {
  Accept: 'application/vnd.github.v3+json',
  ...(REGISTRY_TOKEN && { Authorization: `Bearer ${REGISTRY_TOKEN}` }),
}

// ── 类型定义 ──────────────────────────────────────────────────

export interface PluginFormat {
  entry: string           // 相对于插件目录的文件路径
  element?: string        // webcomponent 格式：custom element 名称
}

export interface PluginManifest {
  id: string
  name: string
  version: string
  type: 'plugin' | 'theme'

  /** 支持的格式，key 优先级：webcomponent > react > script > css */
  formats: Partial<Record<'css' | 'webcomponent' | 'script' | 'react', PluginFormat>>

  /** 注入的 slot 名称列表 */
  slots?: string[]

  /** 配置 schema */
  config?: Record<string, { type: string; default?: unknown; required?: boolean }>

  /** 各文件的 sha256 checksum（安全校验） */
  checksums: Record<string, string>
}

export interface RegistryEntry {
  id: string
  name: string
  type: 'plugin' | 'theme'
  verified: boolean        // 只有 true 的才能加载
  version: string
  source: string           // 目录路径，如 plugins/reading-progress
  description?: string
  preview?: string
  manifest?: PluginManifest  // 懒加载后填充
}

export interface Registry {
  version: string
  themes: RegistryEntry[]
  plugins: RegistryEntry[]
}

// ── 文件加载（GitHub API，dev/prod 通用） ─────────────────────

/**
 * 读取注册表仓库中任意文件的内容
 * GitHub API 会返回 base64 编码内容
 */
async function fetchRepoFile(path: string): Promise<string> {
  const url = `${BASE_URL}/${path}?ref=${REGISTRY_BRANCH}`
  const res = await fetch(url, { headers, next: { revalidate: 300 } })  // 5分钟缓存

  if (!res.ok) {
    throw new Error(`Registry fetch failed: ${path} → ${res.status}`)
  }

  const data = await res.json()
  return Buffer.from(data.content, 'base64').toString('utf-8')
}

/**
 * 读取文件内容并校验 checksum
 * 安全链：每次加载都验，不通过直接拒绝
 */
async function fetchAndVerify(path: string, expectedChecksum?: string): Promise<string> {
  const content = await fetchRepoFile(path)

  if (expectedChecksum) {
    const actual = await sha256(content)
    if (actual !== expectedChecksum) {
      throw new Error(
        `Checksum mismatch for ${path}\n  expected: ${expectedChecksum}\n  actual:   ${actual}`
      )
    }
  }

  return content
}

// ── 注册表 ────────────────────────────────────────────────────

let _registryCache: Registry | null = null

/**
 * 获取注册表（带内存缓存，避免重复请求）
 */
export async function fetchRegistry(force = false): Promise<Registry> {
  if (_registryCache && !force) return _registryCache

  const raw = await fetchRepoFile('registry.json')
  _registryCache = JSON.parse(raw) as Registry
  return _registryCache
}

/**
 * 加载单个插件/主题的 manifest（plugin.json）
 */
export async function fetchManifest(entry: RegistryEntry): Promise<PluginManifest> {
  if (!entry.verified) {
    throw new Error(`${entry.id} is not verified in registry`)
  }

  const raw = await fetchRepoFile(`${entry.source}/plugin.json`)
  return JSON.parse(raw) as PluginManifest
}

// ── 格式解析 & 内容加载 ───────────────────────────────────────

const FORMAT_PRIORITY = ['webcomponent', 'react', 'script', 'css'] as const

/**
 * 按优先级选出最合适的格式
 */
export function resolveFormat(
  manifest: PluginManifest
): 'webcomponent' | 'react' | 'script' | 'css' {
  for (const fmt of FORMAT_PRIORITY) {
    if (manifest.formats[fmt]) return fmt
  }
  throw new Error(`${manifest.id}: no compatible format found`)
}

/**
 * 加载插件某个格式的入口文件内容（含 checksum 验证）
 */
export async function fetchPluginEntry(
  entry: RegistryEntry,
  manifest: PluginManifest,
  fmt?: ReturnType<typeof resolveFormat>
): Promise<{ format: string; content: string; meta: PluginFormat }> {
  const format = fmt ?? resolveFormat(manifest)
  const fmtMeta = manifest.formats[format]!
  const filePath = `${entry.source}/${fmtMeta.entry}`
  const checksum = manifest.checksums[fmtMeta.entry]

  const content = await fetchAndVerify(filePath, checksum)
  return { format, content, meta: fmtMeta }
}

/**
 * 列出插件目录下的所有文件（调试 / Admin 用）
 */
export async function listPluginFiles(
  entry: RegistryEntry
): Promise<Array<{ name: string; path: string }>> {
  const url = `${BASE_URL}/${entry.source}?ref=${REGISTRY_BRANCH}`
  const res = await fetch(url, { headers })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data.map(f => ({ name: f.name, path: f.path })) : []
}

// ── Raw URL（供客户端侧 dynamic import 用） ───────────────────

/**
 * 返回可直接在浏览器 import() 的 URL
 * 服务端校验 checksum 后，把 raw URL 下发给客户端
 */
export function getPluginRawUrl(entry: RegistryEntry, filePath: string): string {
  return `${RAW_URL}/${entry.source}/${filePath}`
}

// ── 工具 ─────────────────────────────────────────────────────

async function sha256(content: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(content)
    )
    return 'sha256:' + Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // Node.js fallback（SSR）
  const { createHash } = await import('crypto')
  return 'sha256:' + createHash('sha256').update(content).digest('hex')
}
