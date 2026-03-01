'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

export default function PluginAdminPage() {
  const { id } = useParams<{ id: string }>()
  const mountRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pluginName, setPluginName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!id) return

    async function loadPluginAdmin() {
      try {
        // Step 1: 从 runtime API 获取插件信息（包含 formats）
        const res = await fetch('/api/plugins/runtime')
        const plugins = await res.json() as Array<{ 
          id: string; 
          source: string; 
          version: string;
          formats?: {
            adminPage?: { entry: string; element: string };
            page?: { route: string; title: string };
          };
          name?: string;
        }>
        const pluginInfo = plugins.find((p) => p.id === id)
        
        if (!pluginInfo) {
          setErrorMsg('插件未在运行时加载')
          setStatus('error')
          return
        }

        const { source, version, formats, name } = pluginInfo

        if (!formats?.adminPage) {
          setErrorMsg('该插件没有管理界面')
          setStatus('error')
          return
        }

        setPluginName(name || id)
        
        const adminEntry = formats.adminPage.entry
        const element = formats.adminPage.element || `blog-${id}-admin`
        const v = encodeURIComponent(version)
        const scriptUrl = `/api/registry/asset?path=${source}/${adminEntry}&v=${v}`

        // Step 3: 加载 WC 脚本
        if (!customElements.get(element)) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script')
            s.src = scriptUrl
            s.onload = () => resolve()
            s.onerror = () => reject(new Error(`加载失败: ${scriptUrl}`))
            document.head.appendChild(s)
          })
        }

        // Step 4: 挂载 WC
        if (mountRef.current && !mountRef.current.querySelector(element)) {
          mountRef.current.appendChild(document.createElement(element))
        }
        
        setStatus('ready')
      } catch (e: any) {
        console.error('[admin-ext]', e)
        setErrorMsg(e.message || '未知错误')
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
          加载失败: {errorMsg || `插件 ${id} 没有管理界面，或未正确安装`}
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
