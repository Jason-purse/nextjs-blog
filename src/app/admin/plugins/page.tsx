'use client'
// src/app/admin/plugins/page.tsx
// 插件管理 + 插件市场

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { PluginCategory, RegistryPlugin, PluginRevalidation, RevalidationMode } from '@/types/plugin'

const CATEGORY_LABELS: Record<PluginCategory | 'all', string> = {
  all: '全部', content: '内容增强', ui: '界面增强',
  social: '社交互动', analytics: '数据分析', seo: 'SEO',
}
const CATEGORY_ICONS: Record<PluginCategory | 'all', string> = {
  all: '🔌', content: '✍️', ui: '🎨', social: '💬', analytics: '📊', seo: '🔍',
}

type Tab = 'installed' | 'market'

interface PluginWithState extends RegistryPlugin {
  installed: boolean
  enabled: boolean
  installedAt?: number
}

export default function AdminPlugins() {
  const router  = useRouter()
  const [tab, setTab]           = useState<Tab>('installed')
  const [plugins, setPlugins]   = useState<PluginWithState[]>([])
  const [loading, setLoading]   = useState(true)
  const [working, setWorking]   = useState<string | null>(null)
  const [reloading, setReloading] = useState(false)
  const [query, setQuery]       = useState('')
  const [category, setCategory] = useState<PluginCategory | 'all'>('all')

  // 倒计时（debounced 插件用）
  const [countdown, setCountdown] = useState<{ secondsLeft: number; total: number } | null>(null)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingDebounce = useRef(false)

  // revalidation 编辑状态 { [pluginId]: {mode, debounceSeconds} }
  const [editingRevalidation, setEditingRevalidation] = useState<Record<string, Partial<PluginRevalidation>>>({})

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/plugins')
      .then(r => { if (r.status === 401) { router.push('/admin/login'); return null } return r.json() })
      .then(data => { if (data) setPlugins(data.plugins) })
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => { load() }, [load])

  // ── 全局 Reload
  async function handleReload() {
    setReloading(true)
    if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null }
    pendingDebounce.current = false
    setCountdown(null)
    await fetch('/api/admin/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setReloading(false)
  }

  // ── 倒计时（debounced）
  function startDebounce(seconds: number) {
    if (countdownTimer.current) clearInterval(countdownTimer.current)
    pendingDebounce.current = true
    setCountdown({ secondsLeft: seconds, total: seconds })
    countdownTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (!prev) return null
        const next = prev.secondsLeft - 1
        if (next <= 0) {
          clearInterval(countdownTimer.current!); countdownTimer.current = null
          fetch('/api/admin/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
          pendingDebounce.current = false
          return null
        }
        return { ...prev, secondsLeft: next }
      })
    }, 1000)
  }

  // ── 安装
  async function install(id: string) {
    setWorking(id)
    const res = await fetch('/api/admin/plugins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'install' }),
    })
    if (res.ok) {
      const data = await res.json()
      setPlugins(prev => prev.map(p => p.id === id ? { ...p, installed: true, enabled: true } : p))
      if (data.revalidation?.mode === 'debounced') startDebounce(data.revalidation.debounceSeconds)
    }
    setWorking(null)
  }

  // ── 卸载
  async function uninstall(id: string) {
    if (!confirm('确认卸载该插件？')) return
    setWorking(id)
    const res = await fetch('/api/admin/plugins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'uninstall' }),
    })
    if (res.ok) setPlugins(prev => prev.map(p => p.id === id ? { ...p, installed: false, enabled: false } : p))
    setWorking(null)
  }

  // ── 启用/停用
  async function toggleEnabled(id: string, enabled: boolean) {
    setWorking(id)
    const res = await fetch('/api/admin/plugins', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    })
    if (res.ok) {
      const data = await res.json()
      setPlugins(prev => prev.map(p => p.id === id ? { ...p, enabled } : p))
      if (data.plugin?.revalidation?.mode === 'debounced') startDebounce(data.plugin.revalidation.debounceSeconds)
    }
    setWorking(null)
  }

  // ── 保存 revalidation 设置
  async function saveRevalidation(id: string) {
    const edit = editingRevalidation[id]
    if (!edit) return
    setWorking(id)
    const res = await fetch('/api/admin/plugins', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, revalidation: edit }),
    })
    if (res.ok) {
      setPlugins(prev => prev.map(p => p.id === id ? { ...p, revalidation: { ...p.revalidation, ...edit } } : p))
      setEditingRevalidation(prev => { const n = { ...prev }; delete n[id]; return n })
    }
    setWorking(null)
  }

  // ── 过滤
  const installed  = plugins.filter(p => p.installed)
  const marketList = plugins.filter(p => {
    const matchCat = category === 'all' || p.category === category
    const matchQ   = !query || p.name.includes(query) || p.description.includes(query) || p.tags.some(t => t.includes(query))
    return matchCat && matchQ
  })

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">← 返回后台</Link>
        <h1 className="font-heading text-xl font-semibold text-[var(--foreground)] flex-1">插件管理</h1>
        <button
          onClick={handleReload}
          disabled={reloading}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors disabled:opacity-50"
        >
          <span className={reloading ? 'animate-spin' : ''}>⟳</span>
          {reloading ? '重建中…' : '立刻重建页面'}
        </button>
      </header>

      {/* 倒计时横幅 */}
      {countdown && (
        <div className="flex items-center justify-between bg-amber-50 border-b border-amber-200 px-6 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-amber-600 text-sm">
              ⏳ 将在
              <span className="font-mono font-bold mx-1">
                {String(Math.floor(countdown.secondsLeft / 60)).padStart(2,'0')}:{String(countdown.secondsLeft % 60).padStart(2,'0')}
              </span>
              后自动重建页面
            </span>
            <div className="w-24 h-1 bg-amber-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                style={{ width: `${((countdown.total - countdown.secondsLeft) / countdown.total) * 100}%` }} />
            </div>
          </div>
          <button onClick={handleReload}
            className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-lg transition-colors">
            立刻应用
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--border)] bg-[var(--card)] px-6">
        <div className="flex gap-0">
          {(['installed', 'market'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-[var(--accent-foreground)] text-[var(--foreground)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}>
              {t === 'installed' ? `已安装 (${installed.length})` : '🛒 插件市场'}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading ? (
          <div className="text-center text-[var(--muted-foreground)] py-20">加载中…</div>
        ) : tab === 'installed' ? (
          /* ──────── 已安装 tab ──────── */
          <div className="space-y-3">
            {installed.length === 0 ? (
              <div className="text-center py-16 text-[var(--muted-foreground)]">
                <div className="text-4xl mb-3">🔌</div>
                <p>还没有安装任何插件</p>
                <button onClick={() => setTab('market')} className="mt-3 text-sm text-[var(--accent-foreground)] underline">去插件市场逛逛</button>
              </div>
            ) : installed.map(p => {
              const editing = editingRevalidation[p.id]
              return (
                <div key={p.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* 左：信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-[var(--foreground)]">{p.name}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">v{p.version}</span>
                        {p.verified && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">官方</span>}
                        <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                          {CATEGORY_ICONS[p.category]} {CATEGORY_LABELS[p.category]}
                        </span>
                        {/* 当前生效时间标签 */}
                        {p.revalidation.mode === 'immediate'
                          ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">立即生效</span>
                          : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">{p.revalidation.debounceSeconds}s 后生效</span>
                        }
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)]">{p.description}</p>

                      {/* 生效时间配置 */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-[var(--muted-foreground)]">生效时间：</span>
                        <select
                          value={editing?.mode ?? p.revalidation.mode}
                          onChange={e => setEditingRevalidation(prev => ({ ...prev, [p.id]: { ...prev[p.id], mode: e.target.value as RevalidationMode } }))}
                          className="text-xs border border-[var(--border)] rounded px-2 py-1 bg-[var(--background)]"
                        >
                          <option value="immediate">立即生效</option>
                          <option value="debounced">延迟生效</option>
                        </select>
                        {(editing?.mode ?? p.revalidation.mode) === 'debounced' && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min="10" max="3600" step="10"
                              value={editing?.debounceSeconds ?? p.revalidation.debounceSeconds}
                              onChange={e => setEditingRevalidation(prev => ({ ...prev, [p.id]: { ...prev[p.id], debounceSeconds: Number(e.target.value) } }))}
                              className="w-20 text-xs border border-[var(--border)] rounded px-2 py-1 bg-[var(--background)]"
                            />
                            <span className="text-xs text-[var(--muted-foreground)]">秒</span>
                          </div>
                        )}
                        {editing && (
                          <button onClick={() => saveRevalidation(p.id)} disabled={working === p.id}
                            className="text-xs bg-[var(--accent-foreground)] text-white px-3 py-1 rounded-lg hover:opacity-80 disabled:opacity-50">
                            保存
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 右：操作 */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* 启用/停用 toggle */}
                      <button onClick={() => toggleEnabled(p.id, !p.enabled)} disabled={working === p.id}
                        title={p.enabled ? '停用' : '启用'}
                        className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${p.enabled ? 'bg-green-500' : 'bg-[var(--secondary)]'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${p.enabled ? 'translate-x-5' : ''}`} />
                      </button>
                      <span className="text-xs text-[var(--muted-foreground)] w-8">{p.enabled ? '启用' : '停用'}</span>
                      {/* 卸载 */}
                      <button onClick={() => uninstall(p.id)} disabled={working === p.id}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50">
                        卸载
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ──────── 插件市场 tab ──────── */
          <div>
            {/* 搜索 + 分类筛选 */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">🔍</span>
                <input
                  type="text" placeholder="搜索插件名称、描述、标签…"
                  value={query} onChange={e => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-foreground)]"
                />
              </div>
            </div>

            {/* 分类标签 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(Object.keys(CATEGORY_LABELS) as (PluginCategory | 'all')[]).map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors ${
                    category === cat
                      ? 'bg-[var(--foreground)] text-[var(--background)]'
                      : 'bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--border)]'
                  }`}>
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span>{CATEGORY_LABELS[cat]}</span>
                  <span className="text-xs opacity-60">
                    ({cat === 'all' ? plugins.length : plugins.filter(p => p.category === cat).length})
                  </span>
                </button>
              ))}
            </div>

            {/* 插件网格 */}
            {marketList.length === 0 ? (
              <div className="text-center py-16 text-[var(--muted-foreground)]">
                <div className="text-4xl mb-3">🔍</div>
                <p>没有找到匹配的插件</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {marketList.map(p => (
                  <div key={p.id}
                    className={`rounded-xl border bg-[var(--card)] p-5 flex flex-col gap-3 transition-colors ${
                      p.installed ? 'border-green-200 bg-green-50/30' : 'border-[var(--border)]'
                    }`}>
                    {/* 顶部 */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[var(--foreground)]">{p.name}</span>
                          <span className="text-xs text-[var(--muted-foreground)]">v{p.version}</span>
                          {p.verified
                            ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">✓ 官方</span>
                            : <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-600">社区</span>
                          }
                        </div>
                        <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">by {p.author} · ↓{p.downloads}</div>
                      </div>
                      {p.installed
                        ? <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-lg shrink-0">✓ 已安装</span>
                        : (
                          <button onClick={() => install(p.id)} disabled={working === p.id}
                            className="shrink-0 text-sm font-medium bg-[var(--foreground)] text-[var(--background)] px-4 py-1.5 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50">
                            {working === p.id ? '安装中…' : '安装'}
                          </button>
                        )
                      }
                    </div>

                    {/* 描述 */}
                    <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{p.description}</p>

                    {/* 标签 + 生效时间 */}
                    <div className="flex flex-wrap gap-1.5">
                      {p.tags.map(t => (
                        <span key={t} className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">#{t}</span>
                      ))}
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${
                        p.revalidation.mode === 'immediate' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {p.revalidation.mode === 'immediate' ? '立即生效' : `${p.revalidation.debounceSeconds}s 后生效`}
                      </span>
                    </div>

                    {/* 已安装 → 显示启用/停用快捷键 */}
                    {p.installed && (
                      <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]">
                        <button onClick={() => toggleEnabled(p.id, !p.enabled)} disabled={working === p.id}
                          className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                            p.enabled
                              ? 'bg-[var(--secondary)] text-[var(--foreground)] hover:bg-red-50 hover:text-red-600'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}>
                          {p.enabled ? '停用' : '启用'}
                        </button>
                        <button onClick={() => uninstall(p.id)} disabled={working === p.id}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                          卸载
                        </button>
                        <button onClick={() => setTab('installed')}
                          className="ml-auto text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                          管理 →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
