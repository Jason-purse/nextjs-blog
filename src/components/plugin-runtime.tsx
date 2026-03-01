'use client'
// src/components/plugin-runtime.tsx
// 客户端 Runtime：加载并挂载 WebComponent / JS 插件到 Slot
// CSS 插件由服务端 PluginLoader 处理；JS 插件由这里处理

import { useEffect } from 'react'

interface JSPlugin {
  id: string
  source: string
  wcEntry: string
  element: string
  slots: string[]
  config?: Record<string, unknown>
  cached?: boolean
}

async function fetchJSPlugins(): Promise<JSPlugin[]> {
  try {
    const res = await fetch('/api/plugins/runtime')
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

// 在 WC 脚本执行前把 config 写入全局变量
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
    script.onerror = () => reject(new Error(`Failed to load plugin: ${plugin.id}`))
    document.head.appendChild(script)
  })
}

function mountToSlot(plugin: JSPlugin): void {
  for (const slotName of plugin.slots) {
    if (slotName === 'body') {
      if (!document.body.querySelector(plugin.element)) {
        document.body.appendChild(document.createElement(plugin.element))
      }
      continue
    }
    document.querySelectorAll(`[data-blog-slot="${slotName}"]`).forEach(slot => {
      if (!slot.querySelector(plugin.element)) {
        slot.appendChild(document.createElement(plugin.element))
      }
    })
  }
}

export function PluginRuntime() {
  useEffect(() => {
    let cancelled = false

    async function run() {
      const plugins = await fetchJSPlugins()
      if (cancelled || plugins.length === 0) return

      // 必须在所有 WC 脚本执行前注入，connectedCallback 读取时已存在
      injectPluginConfig(plugins)

      for (const plugin of plugins) {
        try {
          await loadWC(plugin)
          if (!cancelled) mountToSlot(plugin)
        } catch (e) {
          console.warn(`[PluginRuntime] ${plugin.id} 加载失败:`, e)
        }
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  return null
}
