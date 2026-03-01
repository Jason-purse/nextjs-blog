'use client'
// src/components/plugin-runtime.tsx
// 客户端 Runtime：加载并挂载 WebComponent / JS 插件到 Slot
// CSS 插件由服务端 PluginLoader 处理；JS 插件由这里处理

import { useEffect } from 'react'

interface JSPlugin {
  id: string
  source: string     // plugins/{category}/{id}
  wcEntry: string    // webcomponent/index.js 相对路径
  element: string    // custom element 名称，如 blog-reading-progress
  slots: string[]
  config?: Record<string, unknown>
}

// 从 /api/plugins/runtime 拿到已安装的 JS 插件列表
async function fetchJSPlugins(): Promise<JSPlugin[]> {
  try {
    const res = await fetch('/api/plugins/runtime')
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

// 动态加载 WC 脚本（幂等，已注册不重复加载）
async function loadWC(plugin: JSPlugin): Promise<void> {
  if (customElements.get(plugin.element)) return  // 已注册，跳过

  const url = `/api/registry/asset?path=${plugin.source}/${plugin.wcEntry}`

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load plugin: ${plugin.id}`))
    document.head.appendChild(script)
  })
}

// 挂载到对应 slot
function mountToSlot(plugin: JSPlugin): void {
  for (const slotName of plugin.slots) {
    // "body" slot：直接挂到 document.body，WC 自己负责定位（fixed/absolute）
    if (slotName === 'body') {
      if (!document.body.querySelector(plugin.element)) {
        const el = document.createElement(plugin.element)
        document.body.appendChild(el)
      }
      continue
    }

    const slots = document.querySelectorAll(`[data-blog-slot="${slotName}"]`)
    slots.forEach(slot => {
      if (slot.querySelector(plugin.element)) return
      const el = document.createElement(plugin.element)
      slot.appendChild(el)
    })
  }
}

export function PluginRuntime() {
  useEffect(() => {
    let cancelled = false

    async function run() {
      const plugins = await fetchJSPlugins()
      if (cancelled || plugins.length === 0) return

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

  return null  // 纯逻辑组件，不渲染 UI
}
