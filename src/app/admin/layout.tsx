'use client'
// src/app/admin/layout.tsx
// Admin 全局布局：侧边栏导航

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { href: '/admin',         icon: '🏠', label: '概览' },
  { href: '/admin/plugins', icon: '🔌', label: '插件市场' },
  { href: '/admin/posts',   icon: '📝', label: '文章管理', matchPrefix: true },
  { href: '/admin/storage', icon: '💾', label: '存储管理' },
  { href: '/admin/settings',icon: '⚙️', label: '设置' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // 登录页不显示侧边栏
  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* 侧边栏 */}
      <aside style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        background: 'var(--card)', display: 'flex', flexDirection: 'column',
        padding: '24px 0',
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          <Link href="/admin" style={{ textDecoration: 'none', color: 'var(--foreground)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600 }}>AI Blog</div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>管理后台</div>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px' }}>
          {NAV.map(item => {
            const isActive = item.matchPrefix
              ? pathname.startsWith(item.href)
              : pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                  fontSize: 14, fontWeight: isActive ? 500 : 400,
                  background: isActive ? 'var(--secondary)' : 'transparent',
                  color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                  transition: 'all 0.15s',
                }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* 底部：查看站点 */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
          <Link href="/" target="_blank" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8,
              fontSize: 13, color: 'var(--muted-foreground)',
            }}>
              <span>🌐</span><span>查看博客</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* 主内容区 */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
