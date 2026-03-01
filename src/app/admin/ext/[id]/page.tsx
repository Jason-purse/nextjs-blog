'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

export default function PluginAdminPage() {
  const { id } = useParams<{ id: string }>()
  const mountRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pluginName, setPluginName] = useState('')

  useEffect(() => {
    if (!id) return

    async function loadPluginAdmin() {
      try {
        // 从 runtime API 拿 source + version
        const res = await fetch('/api/plugins/runtime')
        const plugins = await res.json() as Array<{ id: string; source: string; version: string }>
        const pluginInfo = plugins.find((p) => p.id === id)
        if (!pluginInfo) { setStatus('error'); return }

        // 直接从 asset API 读 plugin.json（最完整）
        const pjRes = await fetch(
          `/api/registry/asset?path=${pluginInfo.source}/plugin.json&v=${encodeURIComponent(pluginInfo.version || '1')}`
        )
        if (!pjRes.ok) { setStatus('error'); return }
        const manifest = await pjRes.json()

        if (!manifest?.formats?.adminPage) { setStatus('error'); return }

        setPluginName(manifest.name)
        const adminEntry: string = manifest.formats.adminPage.entry
        const element: string = manifest.formats.adminPage.element || `blog-${id}-admin`
        const v = encodeURIComponent(pluginInfo.version || '1.0.0')
        const scriptUrl = `/api/registry/asset?path=${pluginInfo.source}/${adminEntry}&v=${v}`

        if (!customElements.get(element)) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script')
            s.src = scriptUrl
            s.onload = () => resolve()
            s.onerror = () => reject(new Error(`load failed: ${scriptUrl}`))
            document.head.appendChild(s)
          })
        }

        if (mountRef.current && !mountRef.current.querySelector(element)) {
          mountRef.current.appendChild(document.createElement(element))
        }
        setStatus('ready')
      } catch (e) {
        console.error('[admin-ext]', e)
        setStatus('error')
      }
    }

    loadPluginAdmin()
  }, [id])

  return (
    <div style={{ padding: '32px' }}>
      {status === 'loading' && (
        <div style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
          加载插件管理界面...
        </div>
      )}
      {status === 'error' && (
        <div style={{ color: '#ef4444', fontSize: 14 }}>
          插件 {id} 没有管理界面，或未正确安装。
        </div>
      )}
      {pluginName && status === 'ready' && (
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, color: 'var(--foreground)' }}>
          {pluginName} 管理
        </h1>
      )}
      <div ref={mountRef} />
    </div>
  )
}
