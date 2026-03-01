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
        // 获取插件 runtime 信息
        const res = await fetch('/api/plugins/runtime')
        const plugins = await res.json() as Array<{
          id: string; source: string; version: string
        }>
        // 直接从 plugin.json 获取 adminPage 信息
        const manifestRes = await fetch(`/api/admin/plugins/${id}`)
        const data = await manifestRes.json()
        if (!data?.manifest?.formats?.adminPage) {
          setStatus('error')
          return
        }

        const manifest = data.manifest
        setPluginName(manifest.name)
        const adminEntry: string = manifest.formats.adminPage.entry
        const pluginInfo = plugins.find((p) => p.id === id)
        if (!pluginInfo) { setStatus('error'); return }

        const v = encodeURIComponent(pluginInfo.version || '1.0.0')
        const scriptUrl = `/api/registry/asset?path=${pluginInfo.source}/${adminEntry}&v=${v}`
        const element: string = manifest.formats.adminPage.element || `blog-${id}-admin`

        // 加载 admin WC 脚本
        if (!customElements.get(element)) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script')
            s.src = scriptUrl
            s.onload = () => resolve()
            s.onerror = () => reject()
            document.head.appendChild(s)
          })
        }

        // 挂载 WC
        if (mountRef.current && !mountRef.current.querySelector(element)) {
          mountRef.current.appendChild(document.createElement(element))
        }
        setStatus('ready')
      } catch (e) {
        console.error(e)
        setStatus('error')
      }
    }

    loadPluginAdmin()
  }, [id])

  return (
    <div style={{ padding: '32px' }}>
      {status === 'loading' && (
        <div style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
          加载插件 {id} 管理界面...
        </div>
      )}
      {status === 'error' && (
        <div style={{ color: '#ef4444', fontSize: 14 }}>
          插件 {id} 没有管理界面，或未安装。
        </div>
      )}
      {pluginName && (
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, color: 'var(--foreground)' }}>
          {pluginName} 管理
        </h1>
      )}
      <div ref={mountRef} />
    </div>
  )
}
