'use client'
// src/app/admin/plugins/[id]/page.tsx
// 插件配置页：自动根据 schema 渲染表单，实时预览 CSS 变量变化

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { ConfigSchema, ConfigField, PluginCategory } from '@/types/plugin'

interface PluginRegistryInfo {
  id: string
  name: string
  icon?: string
  author?: string | { name: string; url?: string }
  description: string
  longDescription?: string
  tags: string[]
  source: string
  category: PluginCategory
  version: string
  verified: boolean
  comingSoon?: boolean
}

interface PluginDetail {
  plugin: PluginRegistryInfo
  schema: ConfigSchema
  schemaDefaults: Record<string, unknown>
  userConfig: Record<string, unknown>
  mergedConfig: Record<string, unknown>
  installed: boolean
  enabled: boolean
}

const CATEGORY_META: Record<PluginCategory, { label: string; icon: string }> = {
  theme:     { label: '主题',     icon: '🎨' },
  content:   { label: '内容增强', icon: '✍️' },
  ui:        { label: '界面增强', icon: '🖼️' },
  social:    { label: '社交互动', icon: '💬' },
  analytics: { label: '数据分析', icon: '📊' },
  seo:       { label: 'SEO 优化', icon: '🔍' },
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
  const [allPlugins, setAllPlugins] = useState<PluginRegistryInfo[]>([])

  const load = useCallback(() => {
    setLoading(true)
    // 并行获取详情和全部插件列表（用于获取 registry 信息）
    Promise.all([
      fetch(`/api/admin/plugins/${id}`).then(r => r.json()),
      fetch('/api/admin/plugins').then(r => r.json())
    ])
      .then(([detailData, allData]) => {
        if (detailData?.plugin) {
          setDetail({ ...detailData, installed: detailData.installed ?? false, enabled: detailData.enabled ?? false })
          setConfig(detailData.mergedConfig)
          applyVars(detailData.schema, detailData.mergedConfig)
        }
        // 保存全部插件信息，用于展示 longDescription 等
        if (allData?.plugins) {
          setAllPlugins(allData.plugins)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

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

  const { plugin, schema, installed, enabled } = detail
  const schemaEntries = Object.entries(schema)
  
  // 从 allPlugins 中找到当前插件的 registry 信息
  const registryInfo = allPlugins.find(p => p.id === id)
  const icon = plugin.icon || registryInfo?.icon || CATEGORY_META[plugin.category]?.icon || '🔌'
  // 处理 author - 可能是字符串或对象
  const getAuthorName = (author: string | { name: string; url?: string } | undefined): string => {
    if (!author) return '未知作者'
    if (typeof author === 'string') return author
    return author.name || '未知作者'
  }
  const getAuthorUrl = (author: string | { name: string; url?: string } | undefined): string | undefined => {
    if (!author || typeof author === 'string') return undefined
    return author.url
  }
  const authorName = getAuthorName(plugin.author || registryInfo?.author)
  const authorUrl = getAuthorUrl(plugin.author || registryInfo?.author)
  const longDescription = plugin.longDescription || registryInfo?.longDescription || ''
  const tags = plugin.tags || registryInfo?.tags || []
  const comingSoon = plugin.comingSoon || registryInfo?.comingSoon || false

  return (
    <div style={{ padding: '32px 36px', maxWidth: 900 }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/admin/plugins" style={{ fontSize: 13, color: 'var(--muted-foreground)', textDecoration: 'none' }}>
          ← 插件市场
        </Link>
      </div>

      {/* 插件头部信息 */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 32, alignItems: 'flex-start' }}>
        {/* Icon */}
        <div style={{ 
          width: 80, 
          height: 80, 
          fontSize: 48, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--secondary)', 
          borderRadius: 16,
          flexShrink: 0,
        }}>
          {comingSoon ? '🚧' : icon}
        </div>
        
        {/* 名称和信息 */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{plugin.name}</h1>
            {comingSoon && (
              <span style={{ fontSize: 12, background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: 8 }}>
                即将推出
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 12 }}>
            {authorUrl ? (
              <a href={authorUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted-foreground)' }}>
                {authorName}
              </a>
            ) : (
              <span>{authorName}</span>
            )}
            {' · '}
            <span>v{plugin.version}</span>
            {' · '}
            <span>{CATEGORY_META[plugin.category]?.label || plugin.category}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tags.map(t => (
              <span key={t} style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12, background: 'var(--secondary)', color: 'var(--muted-foreground)' }}>
                #{t}
              </span>
            ))}
            {plugin.verified && (
              <span style={{ fontSize: 12, background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: 12 }}>
                ✓ 官方认证
              </span>
            )}
          </div>
        </div>

        {/* 安装状态和按钮 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {installed && (
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, background: enabled ? '#dcfce7' : '#f3f4f6', color: enabled ? '#166534' : '#6b7280' }}>
              {enabled ? '已安装 · 已启用' : '已安装 · 已停用'}
            </span>
          )}
          {!comingSoon && !installed && (
            <button onClick={async () => {
              const res = await fetch('/api/admin/plugins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'install' }) })
              if (res.ok) router.refresh()
            }} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--foreground)', color: 'var(--background)', fontSize: 14, cursor: 'pointer' }}>
              安装插件
            </button>
          )}
          {comingSoon && (
            <span style={{ fontSize: 13, color: '#92400e' }}>敬请期待</span>
          )}
        </div>
      </div>

      {/* 关于此插件 */}
      {longDescription && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ──── 关于此插件 ────
          </h3>
          <div style={{ 
            background: 'var(--card)', 
            border: '1px solid var(--border)', 
            borderRadius: 12, 
            padding: 20,
            whiteSpace: 'pre-wrap',
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--foreground)',
          }}>
            {longDescription}
          </div>
        </div>
      )}

      {/* 配置区域 */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ──── 配置 ────
        </h3>
        
        {!installed ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>
            请先安装插件后再进行配置
          </div>
        ) : schemaEntries.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>
            该插件暂无可配置项
          </div>
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28 }}>
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
        )}
      </div>

      {/* 开发者信息 */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ──── 开发者信息 ────
        </h3>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>如何在插件中使用配置</div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.8 }}>
            <div style={{ marginBottom: 8 }}>
              <code style={{ fontSize: 12, background: 'var(--secondary)', padding: '2px 6px', borderRadius: 4 }}>CSS 变量</code>：
              <code style={{ fontSize: 12, background: 'var(--secondary)', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>var(--your-css-var)</code>
            </div>
            <div>
              <code style={{ fontSize: 12, background: 'var(--secondary)', padding: '2px 6px', borderRadius: 4 }}>JS 访问</code>：
              <code style={{ fontSize: 12, background: 'var(--secondary)', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>window.__BLOG_PLUGIN_CONFIG__['{id}']</code>
            </div>
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
