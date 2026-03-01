'use client'
// src/app/admin/plugins/page.tsx
// 统一插件市场：主题也是插件，按分类分组展示

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PluginCategory, PluginView, PluginRevalidation, RevalidationMode } from '@/types/plugin'

const CATEGORY_META: Record<PluginCategory, { label: string; icon: string; mutex?: boolean }> = {
  theme:     { label: '主题',     icon: '🎨', mutex: true },
  content:   { label: '内容增强', icon: '✍️' },
  ui:        { label: '界面增强', icon: '🖼️' },
  social:    { label: '社交互动', icon: '💬' },
  analytics: { label: '数据分析', icon: '📊' },
  seo:       { label: 'SEO 优化', icon: '🔍' },
}
const CATEGORY_ORDER: PluginCategory[] = ['theme', 'content', 'ui', 'social', 'analytics', 'seo']

type ViewMode = 'market' | 'installed'

export default function PluginsPage() {
  const router = useRouter()
  const [plugins, setPlugins]     = useState<PluginView[]>([])
  const [activeTheme, setActiveTheme] = useState('theme-editorial')
  const [loading, setLoading]     = useState(true)
  const [working, setWorking]     = useState<string | null>(null)
  const [reloading, setReloading] = useState(false)
  const [viewMode, setViewMode]   = useState<ViewMode>('market')
  const [query, setQuery]         = useState('')
  const [filterCat, setFilterCat] = useState<PluginCategory | 'all'>('all')
  const [countdown, setCountdown] = useState<{ s: number; total: number } | null>(null)
  const [editReval, setEditReval] = useState<Record<string, Partial<PluginRevalidation>>>({})
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/plugins')
      .then(r => { if (r.status === 401) { router.push('/admin/login'); return null } return r.json() })
      .then(d => { if (d) { setPlugins(d.plugins); setActiveTheme(d.activeTheme) } })
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => { load() }, [load])

  // ── Reload
  async function reload() {
    setReloading(true)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setCountdown(null)
    await fetch('/api/admin/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setReloading(false)
  }

  // ── Debounce countdown
  function startCountdown(seconds: number) {
    if (timerRef.current) clearInterval(timerRef.current)
    setCountdown({ s: seconds, total: seconds })
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (!prev) return null
        const next = prev.s - 1
        if (next <= 0) {
          clearInterval(timerRef.current!); timerRef.current = null
          fetch('/api/admin/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
          return null
        }
        return { ...prev, s: next }
      })
    }, 1000)
  }

  // ── 安装
  async function install(id: string) {
    setWorking(id)
    const res = await fetch('/api/admin/plugins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'install' }) })
    if (res.ok) {
      const d = await res.json()
      setPlugins(prev => prev.map(p => p.id === id ? { ...p, installed: true, enabled: true } : p))
      if (d.revalidation?.mode === 'debounced') startCountdown(d.revalidation.debounceSeconds)
    }
    setWorking(null)
  }

  // ── 卸载
  async function uninstall(id: string) {
    if (!confirm('确认卸载该插件？')) return
    setWorking(id)
    const res = await fetch('/api/admin/plugins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'uninstall' }) })
    if (res.ok) setPlugins(prev => prev.map(p => p.id === id ? { ...p, installed: false, enabled: false, active: false } : p))
    setWorking(null)
  }

  // ── 启用/停用（非主题）
  async function toggleEnabled(id: string, enabled: boolean) {
    setWorking(id)
    const res = await fetch('/api/admin/plugins', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, enabled }) })
    if (res.ok) {
      const d = await res.json()
      setPlugins(prev => prev.map(p => p.id === id ? { ...p, enabled } : p))
      if (d.plugin?.revalidation?.mode === 'debounced') startCountdown(d.plugin.revalidation.debounceSeconds)
    }
    setWorking(null)
  }

  // ── 激活主题（互斥）
  async function activateTheme(id: string) {
    setWorking(id)
    const res = await fetch('/api/admin/plugins', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, activateTheme: true }) })
    if (res.ok) {
      setActiveTheme(id)
      setPlugins(prev => prev.map(p => p.category === 'theme' ? { ...p, active: p.id === id, enabled: p.id === id } : p))
    }
    setWorking(null)
  }

  // ── 保存 revalidation
  async function saveReval(id: string) {
    const edit = editReval[id]; if (!edit) return
    setWorking(id)
    const res = await fetch('/api/admin/plugins', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, revalidation: edit }) })
    if (res.ok) {
      // 取保存后的实际模式（edit 优先，否则保留原值）
      const plugin = plugins.find(p => p.id === id)
      const effectiveMode = edit.mode ?? plugin?.revalidation.mode
      setPlugins(prev => prev.map(p => p.id === id ? { ...p, revalidation: { ...p.revalidation, ...edit } } : p))
      setEditReval(prev => { const n = { ...prev }; delete n[id]; return n })
      // 立即生效 → 直接重建；延迟生效 → 启动倒计时
      if (effectiveMode === 'immediate') {
        await fetch('/api/admin/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      } else if (effectiveMode === 'debounced') {
        const secs = edit.debounceSeconds ?? plugin?.revalidation.debounceSeconds ?? 30
        startCountdown(secs)
      }
    }
    setWorking(null)
  }

  // ── 过滤
  const filtered = plugins.filter(p => {
    const matchView = viewMode === 'market' || p.installed
    const matchCat  = filterCat === 'all' || p.category === filterCat
    const matchQ    = !query || p.name.includes(query) || p.description.includes(query) || p.tags.some(t => t.includes(query))
    return matchView && matchCat && matchQ
  })

  // 按分类分组
  const grouped = CATEGORY_ORDER.reduce<Record<PluginCategory, PluginView[]>>((acc, cat) => {
    acc[cat] = filtered.filter(p => p.category === cat)
    return acc
  }, {} as Record<PluginCategory, PluginView[]>)

  const installedCount = plugins.filter(p => p.installed).length
  const enabledCount   = plugins.filter(p => p.enabled).length

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600, margin: 0 }}>插件市场</h1>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 2 }}>
            已安装 {installedCount} 个 · 已启用 {enabledCount} 个
          </div>
        </div>
        <button onClick={reload} disabled={reloading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)', fontSize: 13, cursor: reloading ? 'wait' : 'pointer', opacity: reloading ? 0.6 : 1 }}>
          <span style={{ display: 'inline-block', animation: reloading ? 'spin 1s linear infinite' : 'none' }}>⟳</span>
          {reloading ? '重建中…' : '立刻重建页面'}
        </button>
      </div>

      {/* 倒计时 */}
      {countdown && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#92400e' }}>
            ⏳ 将在 <strong style={{ fontFamily: 'monospace' }}>
              {String(Math.floor(countdown.s / 60)).padStart(2,'0')}:{String(countdown.s % 60).padStart(2,'0')}
            </strong> 后自动重建页面
          </span>
          <div style={{ flex: 1, height: 4, background: '#fde68a', borderRadius: 2 }}>
            <div style={{ height: '100%', background: '#f59e0b', borderRadius: 2, width: `${((countdown.total - countdown.s) / countdown.total) * 100}%`, transition: 'width 1s linear' }} />
          </div>
          <button onClick={reload} style={{ fontSize: 12, padding: '4px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, cursor: 'pointer', color: '#92400e' }}>立刻应用</button>
        </div>
      )}

      {/* 工具栏 */}
      <div style={{ padding: '20px 32px 0', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* 视图切换 */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {(['market', 'installed'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ padding: '7px 16px', fontSize: 13, border: 'none', cursor: 'pointer', background: viewMode === v ? 'var(--foreground)' : 'var(--card)', color: viewMode === v ? 'var(--background)' : 'var(--muted-foreground)' }}>
              {v === 'market' ? '🛒 全部插件' : `📦 已安装 (${installedCount})`}
            </button>
          ))}
        </div>

        {/* 搜索 */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>🔍</span>
          <input type="text" placeholder="搜索插件…" value={query} onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)', fontSize: 13, boxSizing: 'border-box' }} />
        </div>

        {/* 分类筛选 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', ...CATEGORY_ORDER] as (PluginCategory | 'all')[]).map(cat => {
            const meta = cat === 'all' ? { icon: '🔌', label: '全部' } : CATEGORY_META[cat]
            const cnt  = cat === 'all' ? filtered.length : filtered.filter(p => p.category === cat).length
            return (
              <button key={cat} onClick={() => setFilterCat(cat)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer', background: filterCat === cat ? 'var(--foreground)' : 'var(--card)', color: filterCat === cat ? 'var(--background)' : 'var(--muted-foreground)' }}>
                <span>{meta.icon}</span><span>{meta.label}</span><span style={{ opacity: 0.6 }}>({cnt})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 插件列表（按分类分组） */}
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted-foreground)' }}>加载中…</div>
        ) : (
          CATEGORY_ORDER.map(cat => {
            const items = grouped[cat]
            if (items.length === 0) return null
            const meta    = CATEGORY_META[cat]
            const isMutex = meta.mutex // 主题区

            return (
              <section key={cat}>
                {/* 分类标题 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 18 }}>{meta.icon}</span>
                  <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{meta.label}</h2>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)', background: 'var(--secondary)', padding: '2px 8px', borderRadius: 10 }}>{items.length}</span>
                  {isMutex && <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 10 }}>单选</span>}
                </div>

                {/* 主题区：大卡片网格 */}
                {isMutex ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                    {items.map(p => (
                      <ThemeCard key={p.id} plugin={p} isActive={activeTheme === p.id}
                        working={working === p.id}
                        onInstall={() => install(p.id)}
                        onUninstall={() => uninstall(p.id)}
                        onActivate={() => activateTheme(p.id)} />
                    ))}
                  </div>
                ) : (
                  /* 其他分类：列表行 */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map(p => {
                      const edit = editReval[p.id]
                      return (
                        <PluginRow key={p.id} plugin={p} working={working === p.id}
                          editing={edit}
                          onInstall={() => install(p.id)}
                          onUninstall={() => uninstall(p.id)}
                          onToggle={() => toggleEnabled(p.id, !p.enabled)}
                          onEditReval={(patch) => setEditReval(prev => ({ ...prev, [p.id]: { ...prev[p.id], ...patch } }))}
                          onSaveReval={() => saveReval(p.id)} />
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── 主题卡片
function ThemeCard({ plugin: p, isActive, working, onInstall, onUninstall, onActivate }: {
  plugin: PluginView; isActive: boolean; working: boolean
  onInstall(): void; onUninstall(): void; onActivate(): void
}) {
  return (
    <div style={{
      border: `2px solid ${isActive ? 'var(--accent-foreground)' : 'var(--border)'}`,
      borderRadius: 12, background: 'var(--card)', overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* 预览区 */}
      <div style={{ height: 100, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
        🎨
      </div>
      {/* 信息 */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
          {isActive && <span style={{ fontSize: 11, background: 'var(--foreground)', color: 'var(--background)', padding: '2px 6px', borderRadius: 8 }}>✓ 当前</span>}
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 12px', lineHeight: 1.5 }}>{p.description}</p>
        {/* 操作 */}
        {!p.installed ? (
          <button onClick={onInstall} disabled={working}
            style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: 'var(--foreground)', color: 'var(--background)', fontSize: 13, cursor: working ? 'wait' : 'pointer', opacity: working ? 0.6 : 1 }}>
            {working ? '安装中…' : '安装'}
          </button>
        ) : isActive ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, padding: '7px 0', textAlign: 'center', borderRadius: 8, background: 'var(--secondary)', fontSize: 13, color: 'var(--muted-foreground)' }}>已激活</div>
            <button onClick={onUninstall} disabled={working}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>卸载</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onActivate} disabled={working}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--foreground)', color: 'var(--background)', fontSize: 13, cursor: working ? 'wait' : 'pointer' }}>
              {working ? '切换中…' : '激活'}
            </button>
            <button onClick={onUninstall} disabled={working}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>卸载</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 普通插件行
function PluginRow({ plugin: p, working, editing, onInstall, onUninstall, onToggle, onEditReval, onSaveReval }: {
  plugin: PluginView; working: boolean; editing?: Partial<PluginRevalidation>
  onInstall(): void; onUninstall(): void; onToggle(): void
  onEditReval(patch: Partial<PluginRevalidation>): void; onSaveReval(): void
}) {
  return (
    <div style={{ border: `1px solid ${p.installed && p.enabled ? '#d1fae5' : 'var(--border)'}`, borderRadius: 12, background: p.installed && p.enabled ? '#f0fdf4' : 'var(--card)', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* 左：信息 */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>v{p.version}</span>
            {p.verified && <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 8 }}>✓ 官方</span>}
            {!p.verified && <span style={{ fontSize: 11, background: '#fff7ed', color: '#9a3412', padding: '1px 6px', borderRadius: 8 }}>社区</span>}
            <span style={{ fontSize: 11, color: '#6b7280' }}>by {p.author} · ↓{p.downloads}</span>
            {/* 生效时间 */}
            <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: p.revalidation.mode === 'immediate' ? '#eff6ff' : '#fffbeb', color: p.revalidation.mode === 'immediate' ? '#1d4ed8' : '#92400e' }}>
              {p.revalidation.mode === 'immediate' ? '立即生效' : `${p.revalidation.debounceSeconds}s 后生效`}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: '0 0 6px' }}>{p.description}</p>
          {/* tags */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {p.tags.map(t => <span key={t} style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: 'var(--secondary)', color: 'var(--muted-foreground)' }}>#{t}</span>)}
          </div>
          {/* 生效时间编辑（仅已安装） */}
          {p.installed && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>生效时间：</span>
              <select value={editing?.mode ?? p.revalidation.mode}
                onChange={e => onEditReval({ mode: e.target.value as RevalidationMode })}
                style={{ fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', background: 'var(--background)' }}>
                <option value="immediate">立即生效</option>
                <option value="debounced">延迟生效</option>
              </select>
              {(editing?.mode ?? p.revalidation.mode) === 'debounced' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="number" min={10} max={3600} step={10}
                    value={editing?.debounceSeconds ?? p.revalidation.debounceSeconds}
                    onChange={e => onEditReval({ debounceSeconds: Number(e.target.value) })}
                    style={{ width: 64, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', background: 'var(--background)' }} />
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>秒</span>
                </div>
              )}
              {editing && (
                <button onClick={onSaveReval} disabled={working}
                  style={{ fontSize: 12, padding: '3px 12px', borderRadius: 6, border: 'none', background: 'var(--foreground)', color: 'var(--background)', cursor: 'pointer' }}>保存</button>
              )}
            </div>
          )}
        </div>

        {/* 右：操作 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!p.installed ? (
            <button onClick={onInstall} disabled={working}
              style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--foreground)', color: 'var(--background)', fontSize: 13, cursor: working ? 'wait' : 'pointer', opacity: working ? 0.6 : 1 }}>
              {working ? '…' : '安装'}
            </button>
          ) : (
            <>
              {/* Toggle */}
              <button onClick={onToggle} disabled={working} title={p.enabled ? '停用' : '启用'}
                style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: p.enabled ? '#22c55e' : '#d1d5db', position: 'relative', transition: 'background 0.2s', opacity: working ? 0.5 : 1 }}>
                <span style={{ position: 'absolute', top: 2, left: p.enabled ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', minWidth: 28 }}>{p.enabled ? '启用' : '停用'}</span>
              <button onClick={onUninstall} disabled={working}
                style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>卸载</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
