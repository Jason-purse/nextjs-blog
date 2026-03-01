'use client'
// src/app/admin/plugins/page.tsx

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RevalidationInfo {
  mode: 'immediate' | 'debounced'
  debounceSeconds: number
}

interface RegistryEntry {
  id: string
  name: string
  description?: string
  version: string
  verified: boolean
  installed: boolean
  active?: boolean
  revalidation?: { mode: string; debounceSeconds?: number; description?: string }
}

export default function AdminPlugins() {
  const router  = useRouter()
  const [plugins, setPlugins] = useState<RegistryEntry[]>([])
  const [themes,  setThemes]  = useState<RegistryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)

  // 倒计时状态：{secondsLeft, total, applying}
  const [countdown, setCountdown] = useState<{ secondsLeft: number; total: number } | null>(null)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingRevalidate = useRef(false)

  useEffect(() => {
    fetch('/api/admin/plugins')
      .then(r => { if (r.status === 401) { router.push('/admin/login'); return null } return r.json() })
      .then(data => { if (data) { setPlugins(data.plugins); setThemes(data.themes) } })
      .finally(() => setLoading(false))
  }, [router])

  // 启动 / 重置倒计时
  function startCountdown(seconds: number) {
    if (countdownTimer.current) clearInterval(countdownTimer.current)
    pendingRevalidate.current = true
    setCountdown({ secondsLeft: seconds, total: seconds })

    countdownTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (!prev) return null
        const next = prev.secondsLeft - 1
        if (next <= 0) {
          clearInterval(countdownTimer.current!)
          countdownTimer.current = null
          triggerRevalidate()
          return null
        }
        return { ...prev, secondsLeft: next }
      })
    }, 1000)
  }

  async function triggerRevalidate() {
    if (!pendingRevalidate.current) return
    pendingRevalidate.current = false
    setCountdown(null)
    await fetch('/api/admin/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
  }

  function applyNow() {
    if (countdownTimer.current) clearInterval(countdownTimer.current)
    countdownTimer.current = null
    triggerRevalidate()
  }

  async function toggle(id: string, installed: boolean) {
    setWorking(id)
    const res = await fetch('/api/admin/plugins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: installed ? 'uninstall' : 'install' }),
    })
    if (res.ok) {
      const data: { installed: string[]; revalidation: RevalidationInfo } = await res.json()
      setPlugins(prev => prev.map(p => p.id === id ? { ...p, installed: !installed } : p))

      if (data.revalidation.mode === 'debounced' && data.revalidation.debounceSeconds > 0) {
        // 防抖：每次操作重置倒计时
        startCountdown(data.revalidation.debounceSeconds)
      }
      // immediate 模式服务端已经 revalidate，无需客户端处理
    }
    setWorking(null)
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          ← 返回后台
        </Link>
        <h1 className="font-heading text-xl font-semibold text-[var(--foreground)]">插件管理</h1>
      </header>

      {/* 倒计时横幅 */}
      {countdown && (
        <div className="flex items-center justify-between bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-amber-600 text-sm">
              ⏳ 页面将在
              <span className="font-mono font-bold mx-1">
                {String(Math.floor(countdown.secondsLeft / 60)).padStart(2, '0')}:
                {String(countdown.secondsLeft % 60).padStart(2, '0')}
              </span>
              后重新生成
            </span>
            {/* 进度条 */}
            <div className="w-32 h-1.5 bg-amber-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                style={{ width: `${((countdown.total - countdown.secondsLeft) / countdown.total) * 100}%` }}
              />
            </div>
          </div>
          <button
            onClick={applyNow}
            className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            立刻应用
          </button>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">
        {loading ? (
          <div className="text-center text-[var(--muted-foreground)] py-20">加载中…</div>
        ) : (
          <>
            {/* 功能插件 */}
            <section>
              <h2 className="font-heading text-lg font-semibold text-[var(--foreground)] mb-4">功能插件</h2>
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
                          {/* 生效策略标签 */}
                          {p.revalidation?.mode === 'immediate' ? (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">立即生效</span>
                          ) : p.revalidation?.mode === 'debounced' ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
                              {p.revalidation.debounceSeconds}s 后生效
                            </span>
                          ) : null}
                        </div>
                        {p.description && (
                          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{p.description}</p>
                        )}
                        {p.revalidation?.description && (
                          <p className="mt-0.5 text-xs text-[var(--muted-foreground)] italic">{p.revalidation.description}</p>
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
              <h2 className="font-heading text-lg font-semibold text-[var(--foreground)] mb-4">主题</h2>
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
