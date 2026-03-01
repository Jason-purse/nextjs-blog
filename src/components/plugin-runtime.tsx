'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import type { BlogPluginContext, BlogContentContext } from '@/types/blog-context'

interface JSPlugin {
  id: string
  source: string
  version: string
  wcEntry: string
  element: string
  slots: string[]
  allowedRoutes?: string[]
  config?: Record<string, unknown>
}

function detectRouteType(pathname: string): BlogPluginContext['platform']['route']['type'] {
  if (pathname === '/' || pathname === '') return 'home'
  if (pathname.startsWith('/blog/') && pathname.length > 6) return 'article'
  if (pathname.startsWith('/categories')) return 'category'
  if (pathname.startsWith('/tags')) return 'tag'
  if (pathname.startsWith('/admin')) return 'admin'
  return 'other'
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

function buildEventBus() {
  return {
    emit: (event: string, data?: unknown) => {
      window.dispatchEvent(new CustomEvent(event, { detail: data }))
    },
    on: (event: string, handler: (data: unknown) => void) => {
      window.addEventListener(event, (e) => handler((e as CustomEvent).detail))
    },
    off: (event: string, handler: (data: unknown) => void) => {
      window.removeEventListener(event, handler as EventListener)
    },
  }
}

function getActiveThemeId(): string {
  // 从 DOM 读取（layout.tsx 注入了 data-theme 属性）
  return document.documentElement.getAttribute('data-theme') || 'default'
}

function initBlogCtx(pathname: string): void {
  const bus = buildEventBus()
  const contentCtx: BlogContentContext | undefined = window.__BLOG_CONTENT_CTX__

  window.__BLOG_CTX__ = {
    platform: {
      theme: { id: getActiveThemeId(), name: getActiveThemeId() },
      route: { pathname, type: detectRouteType(pathname) },
      darkMode: document.documentElement.getAttribute('data-dark') === 'true',
      locale: 'zh-CN',
    },
    content: detectRouteType(pathname) === 'article' ? contentCtx : undefined,
    plugins: {},
    ...bus,
  }
}

function updateBlogCtxRoute(pathname: string): void {
  if (!window.__BLOG_CTX__) return
  window.__BLOG_CTX__.platform.route = {
    pathname,
    type: detectRouteType(pathname),
  }
  window.__BLOG_CTX__.platform.darkMode =
    document.documentElement.getAttribute('data-dark') === 'true'
  // 非文章页清除内容上下文
  if (detectRouteType(pathname) !== 'article') {
    window.__BLOG_CTX__.content = undefined
  } else if (window.__BLOG_CONTENT_CTX__) {
    window.__BLOG_CTX__.content = window.__BLOG_CONTENT_CTX__
  }
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
  window.__BLOG_PLUGIN_CONFIG__ = config
}

async function loadWC(plugin: JSPlugin): Promise<void> {
  if (customElements.get(plugin.element)) return
  // 加版本号做缓存破坏，确保插件更新后浏览器能拉到新脚本
  const v = encodeURIComponent(plugin.version || '1.0.0')
  const url = `/api/registry/asset?path=${plugin.source}/${plugin.wcEntry}&v=${v}`
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

function registerPluginInCtx(plugin: JSPlugin): void {
  if (!window.__BLOG_CTX__) return
  window.__BLOG_CTX__.plugins[plugin.id] = {
    config: plugin.config ?? {},
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
      initBlogCtx(pathname)

      for (const plugin of plugins) {
        try {
          await loadWC(plugin)
          registerPluginInCtx(plugin)
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

      // 初始化完成后 dispatch content-ready（文章页）
      if (detectRouteType(pathname) === 'article') {
        window.dispatchEvent(new CustomEvent('blog:content-ready', {
          detail: window.__BLOG_CTX__?.content
        }))
      }
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 路由变化时：更新 ctx + dispatch 事件 + 更新可见性
  useEffect(() => {
    updateBlogCtxRoute(pathname)
    window.dispatchEvent(new CustomEvent('blog:route-change', { detail: { pathname } }))

    if (detectRouteType(pathname) === 'article') {
      // 路由变到文章页时，延迟 dispatch content-ready（等 DOM 更新）
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('blog:content-ready', {
          detail: window.__BLOG_CTX__?.content
        }))
      }))
    }

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
