'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface JSPlugin {
  id: string
  source: string
  wcEntry: string
  element: string
  slots: string[]
  allowedRoutes?: string[]
  config?: Record<string, unknown>
}

function matchRoute(allowedRoutes: string[] | undefined, pathname: string): boolean {
  if (!allowedRoutes || allowedRoutes.length === 0) return true
  return allowedRoutes.some(pattern => {
    if (pattern === '*') return true
    if (pattern.endsWith('/*')) {
      const base = pattern.slice(0, -2)
      return pathname.startsWith(base + '/') && pathname.length > base.length + 1
    }
    return pathname === pattern
  })
}

async function fetchJSPlugins(): Promise<JSPlugin[]> {
  try {
    const res = await fetch('/api/plugins/runtime')
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

function injectPluginConfig(plugins: JSPlugin[]) {
  const config: Record<string, Record<string, unknown>> = {}
  for (const p of plugins) {
    if (p.config) config[p.id] = p.config
  }
  // @ts-expect-error global inject
  window.__BLOG_PLUGIN_CONFIG__ = config
}

async function loadWC(plugin: JSPlugin): Promise<void> {
  if (customElements.get(plugin.element)) return
  const url = `/api/registry/asset?path=${plugin.source}/${plugin.wcEntry}`
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load: ${plugin.id}`))
    document.head.appendChild(script)
  })
}

function mountToSlot(plugin: JSPlugin): void {
  for (const slot of plugin.slots) {
    if (slot === 'body') {
      if (!document.body.querySelector(plugin.element)) {
        document.body.appendChild(document.createElement(plugin.element))
      }
      continue
    }
    document.querySelectorAll(`[data-blog-slot="${slot}"]`).forEach(slotEl => {
      if (!slotEl.querySelector(plugin.element)) {
        slotEl.appendChild(document.createElement(plugin.element))
      }
    })
  }
}

export function PluginRuntime() {
  const pathname = usePathname()
  const pluginsRef = useRef<JSPlugin[]>([])
  const initializedRef = useRef(false)

  // 初始化：加载所有 WC，按 allowedRoutes 决定是否挂载
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    async function init() {
      const plugins = await fetchJSPlugins()
      pluginsRef.current = plugins
      injectPluginConfig(plugins)

      for (const plugin of plugins) {
        try {
          await loadWC(plugin)
          // 总是挂载到 DOM（WC 自身也会做路由检测），但设置初始可见性
          mountToSlot(plugin)
          const el = document.querySelector(plugin.element) as HTMLElement | null
          if (el) {
            el.style.display = matchRoute(plugin.allowedRoutes, pathname) ? '' : 'none'
          }
        } catch (e) {
          console.warn(`[PluginRuntime] ${plugin.id} 加载失败:`, e)
        }
      }
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 路由变化时：dispatch 事件 + 更新可见性
  useEffect(() => {
    // dispatch 路由变化事件（WC 订阅此事件来刷新内容）
    window.dispatchEvent(new CustomEvent('blog:route-change', { detail: { pathname } }))

    // 更新每个插件元素的可见性
    for (const plugin of pluginsRef.current) {
      const el = document.querySelector(plugin.element) as HTMLElement | null
      if (el) {
        el.style.display = matchRoute(plugin.allowedRoutes, pathname) ? '' : 'none'
      }
    }
  }, [pathname])

  return null
}
