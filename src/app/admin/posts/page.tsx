'use client'
// src/app/admin/posts/page.tsx
// 文章管理：从 admin/page.tsx 抽离出来的独立页面

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Post {
  slug: string
  title: string
  date: string
  tags: string[]
  readingTime: string
}

export default function PostsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/posts')
      .then(r => { if (r.status === 401) { router.push('/admin/login'); return null } return r.json() })
      .then(data => { if (data) setPosts(data) })
      .finally(() => setLoading(false))
  }, [router])

  async function handleDelete(slug: string) {
    if (!confirm('确认删除该文章？此操作不可恢复。')) return
    const res = await fetch('/api/admin/posts?slug=' + slug, { method: 'DELETE' })
    if (res.ok) setPosts(posts.filter(p => p.slug !== slug))
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, marginBottom: 4 }}>文章管理</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14, margin: 0 }}>共 {posts.length} 篇文章</p>
        </div>
        <Link href="/admin/new"
          style={{ padding: '9px 20px', background: 'var(--foreground)', color: 'var(--background)', borderRadius: 8, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
          + 新建文章
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted-foreground)' }}>加载中…</div>
      ) : posts.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted-foreground)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <p>还没有文章，<Link href="/admin/new" style={{ color: 'var(--foreground)' }}>创建第一篇</Link></p>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--secondary)' }}>
                {['标题', '日期', '标签', '操作'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500, textAlign: 'left', color: 'var(--muted-foreground)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.slug} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 20px', fontSize: 15 }}>
                    <Link href={'/blog/' + post.slug} target="_blank"
                      style={{ color: 'var(--foreground)', textDecoration: 'none', fontWeight: 500 }}>
                      {post.title}
                    </Link>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{post.date}</td>
                  <td style={{ padding: '14px 20px', fontSize: 12 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {post.tags.map(t => (
                        <span key={t} style={{ background: 'var(--secondary)', padding: '2px 8px', borderRadius: 10, color: 'var(--muted-foreground)' }}>#{t}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Link href={'/admin/edit/' + post.slug}
                      style={{ marginRight: 16, color: 'var(--foreground)', fontSize: 13, textDecoration: 'none' }}>编辑</Link>
                    <button onClick={() => handleDelete(post.slug)}
                      style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
