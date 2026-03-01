'use client'
import { useEffect, useRef } from 'react'

interface Props {
  id: string
  title: string
  source: string
  entry: string
  element: string
  version: string
}

export function PluginPublicPage({ id, title, source, entry, element, version }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!entry || !element) return
    const v = encodeURIComponent(version)
    const url = `/api/registry/asset?path=${source}/${entry}&v=${v}`

    async function load() {
      if (!customElements.get(element)) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = url
          s.onload = () => resolve()
          s.onerror = () => reject()
          document.head.appendChild(s)
        })
      }
      if (mountRef.current && !mountRef.current.querySelector(element)) {
        mountRef.current.appendChild(document.createElement(element))
      }
    }

    load().catch(console.error)
  }, [source, entry, element, version])

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 32, color: 'var(--foreground)' }}>
        {title}
      </h1>
      <div ref={mountRef} />
    </div>
  )
}
