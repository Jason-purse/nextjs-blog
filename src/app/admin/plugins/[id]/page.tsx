'use client'
// src/app/admin/plugins/[id]/page.tsx
// 插件配置页：自动根据 schema 渲染表单，实时预览 CSS 变量变化

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { ConfigSchema, ConfigField } from '@/types/plugin'

interface PluginDetail {
  plugin: { id: string; name: string; source: string; description: string; category: string }
  schema: ConfigSchema
  schemaDefaults: Record<string, unknown>
  userConfig: Record<string, unknown>
  mergedConfig: Record<string, unknown>
}

export default function PluginConfigPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [detail, setDetail]   = useState<PluginDetail | null>(null)
  const [config, setConfig]   = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/plugins/${id}`)
      .then(r => { if (r.status === 401) { router.push('/admin/login'); return null } return r.json() })
      .then(d => {
        if (d) {
          setDetail(d)
          setConfig(d.mergedConfig)
          // 初始注入 CSS 变量到当前页面（预览用）
          applyVars(d.schema, d.mergedConfig)
        }
      })
      .finally(() => setLoading(false))
  }, [id, router])

  useEffect(() => { load() }, [load])

  // 实时将 CSS 变量注入到 document.documentElement（预览，不走网络）
  function applyVars(schema: ConfigSchema, cfg: Record<string, unknown>) {
    for (const [key, field] of Object.entries(schema)) {
      if (!field.cssVar) continue
      const value = cfg[key] ?? (field as { default: unknown }).default
      const unit = (field as { unit?: string }).unit ?? ''
      document.documentElement.style.setProperty(field.cssVar, `${value}${unit}`)
    }
  }

  function handleChange(key: string, value: unknown) {
    const next = { ...config, [key]: value }
    setConfig(next)
    if (detail?.schema) applyVars(detail.schema, next)
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/admin/plugins/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })
    // 立即重建页面（配置变化需要 plugin-loader 重新注入）
    await fetch('/api/admin/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleReset() {
    if (!detail) return
    setConfig(detail.schemaDefaults)
    applyVars(detail.schema, detail.schemaDefaults)
    setSaved(false)
  }

  if (loading) return <div style={{ padding: 60, color: 'var(--muted-foreground)' }}>加载中…</div>
  if (!detail) return <div style={{ padding: 60, color: '#dc2626' }}>插件不存在</div>

  const { plugin, schema } = detail
  const schemaEntries = Object.entries(schema)

  return (
    <div style={{ padding: '32px 36px', maxWidth: 800 }}>
      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <Link href="/admin/plugins" style={{ fontSize: 13, color: 'var(--muted-foreground)', textDecoration: 'none' }}>
          ← 插件市场
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{plugin.name}</span>
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', background: 'var(--secondary)', padding: '2px 8px', borderRadius: 8 }}>
          配置
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
        {/* 左：表单 */}
        <div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{plugin.name}</h2>
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 28 }}>{plugin.description}</p>

            {schemaEntries.length === 0 ? (
              <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>该插件暂无可配置项</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {schemaEntries.map(([key, field]) => (
                  <ConfigField
                    key={key}
                    fieldKey={key}
                    field={field}
                    value={config[key] ?? (field as { default: unknown }).default}
                    onChange={(v) => handleChange(key, v)}
                  />
                ))}
              </div>
            )}

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: 12, marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)', alignItems: 'center' }}>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '9px 24px', background: 'var(--foreground)', color: 'var(--background)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '保存中…' : '保存配置'}
              </button>
              <button onClick={handleReset}
                style={{ padding: '9px 18px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                重置默认
              </button>
              {saved && (
                <span style={{ fontSize: 13, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                  ✓ 已保存并重建页面
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 右：说明卡片 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>💡 实时预览</div>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
              修改配置项时，页面效果即时更新（本地 CSS 变量注入）。
              点击「保存配置」后，变更会写入存储并触发页面重建。
            </p>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>🔧 配置原理</div>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
              配置值以 CSS 变量形式注入，插件通过 <code style={{ fontSize: 11, background: 'var(--secondary)', padding: '1px 4px', borderRadius: 3 }}>var()</code> 引用，双方完全解耦。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 配置字段渲染组件
function ConfigField({ fieldKey, field, value, onChange }: {
  fieldKey: string
  field: ConfigField
  value: unknown
  onChange(v: unknown): void
}) {
  const labelStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, fontSize: 14, fontWeight: 500,
  }
  const inputBase: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: 14,
    border: '1px solid var(--border)', borderRadius: 8,
    background: 'var(--background)', color: 'var(--foreground)',
    boxSizing: 'border-box',
  }

  return (
    <div>
      <div style={labelStyle}>
        <span>{field.label}</span>
        {field.cssVar && (
          <code style={{ fontSize: 11, color: 'var(--muted-foreground)', background: 'var(--secondary)', padding: '2px 6px', borderRadius: 4 }}>
            {field.cssVar}
          </code>
        )}
      </div>

      {field.type === 'color' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="color" value={String(value)} onChange={e => onChange(e.target.value)}
            style={{ width: 44, height: 38, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
          <input type="text" value={String(value)} onChange={e => onChange(e.target.value)}
            style={{ ...inputBase, flex: 1 }} />
        </div>
      )}

      {field.type === 'range' && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input type="range"
            min={(field as { min: number }).min} max={(field as { max: number }).max}
            value={Number(value)} onChange={e => onChange(Number(e.target.value))}
            style={{ flex: 1 }} />
          <span style={{ fontSize: 14, fontWeight: 500, minWidth: 48, textAlign: 'right', color: 'var(--foreground)' }}>
            {String(value)}{(field as { unit?: string }).unit ?? ''}
          </span>
        </div>
      )}

      {field.type === 'select' && (
        <select value={String(value)} onChange={e => onChange(e.target.value)} style={inputBase}>
          {(field as { options: { value: string; label: string }[] }).options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {field.type === 'text' && (
        <input type="text" value={String(value)}
          onChange={e => onChange(e.target.value)}
          placeholder={(field as { placeholder?: string }).placeholder}
          style={inputBase} />
      )}

      {field.type === 'number' && (
        <input type="number"
          min={(field as { min?: number }).min} max={(field as { max?: number }).max}
          value={Number(value)} onChange={e => onChange(Number(e.target.value))}
          style={inputBase} />
      )}

      {field.type === 'toggle' && (
        <button onClick={() => onChange(!value)}
          style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
            background: value ? '#22c55e' : '#d1d5db', position: 'relative', transition: 'background 0.2s' }}>
          <span style={{ position: 'absolute', top: 3, left: value ? 24 : 3, width: 20, height: 20,
            borderRadius: 10, background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </button>
      )}
    </div>
  )
}
