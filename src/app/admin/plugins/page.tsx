'use client'
// src/app/admin/plugins/page.tsx

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RegistryEntry {
  id: string
  name: string
  description?: string
  version: string
  verified: boolean
  installed: boolean
  active?: boolean   // 主题专用
}

export default function AdminPlugins() {
  const router = useRouter()
  const [plugins, setPlugins]   = useState<RegistryEntry[]>([])
  const [themes, setThemes]     = useState<RegistryEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [working, setWorking]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/plugins')
      .then(r => { if (r.status === 401) { router.push('/admin/login'); return null } return r.json() })
      .then(data => { if (data) { setPlugins(data.plugins); setThemes(data.themes) } })
      .finally(() => setLoading(false))
  }, [router])

  async function toggle(id: string, installed: boolean) {
    setWorking(id)
    const res = await fetch('/api/admin/plugins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: installed ? 'uninstall' : 'install' }),
    })
    if (res.ok) {
      setPlugins(prev => prev.map(p => p.id === id ? { ...p, installed: !installed } : p))
    }
    setWorking(null)
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* 顶部导航 */}
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          ← 返回后台
        </Link>
        <h1 className="font-heading text-xl font-semibold text-[var(--foreground)]">插件管理</h1>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">

        {loading ? (
          <div className="text-center text-[var(--muted-foreground)] py-20">加载中…</div>
        ) : (
          <>
            {/* 功能插件 */}
            <section>
              <h2 className="font-heading text-lg font-semibold text-[var(--foreground)] mb-4">
                功能插件
              </h2>
              {plugins.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">暂无可用插件</p>
              ) : (
                <ul className="space-y-3">
                  {plugins.map(p => (
                    <li key={p.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--foreground)]">{p.name}</span>
                          <span className="text-xs text-[var(--muted-foreground)]">v{p.version}</span>
                          {p.verified && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">官方</span>
                          )}
                        </div>
                        {p.description && (
                          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{p.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggle(p.id, p.installed)}
                        disabled={working === p.id}
                        className={`min-w-[72px] rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                          p.installed
                            ? 'bg-[var(--secondary)] text-[var(--foreground)] hover:bg-red-50 hover:text-red-600'
                            : 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-80'
                        }`}
                      >
                        {working === p.id ? '…' : p.installed ? '停用' : '安装'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 主题 */}
            <section>
              <h2 className="font-heading text-lg font-semibold text-[var(--foreground)] mb-4">
                主题
              </h2>
              <ul className="space-y-3">
                {themes.map(t => (
                  <li key={t.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--foreground)]">{t.name}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">v{t.version}</span>
                        {t.active && (
                          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--accent-foreground)]">
                            当前使用
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{t.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">内置</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
