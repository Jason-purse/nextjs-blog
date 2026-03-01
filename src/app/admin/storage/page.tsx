'use client'
// src/app/admin/storage/page.tsx
// 存储管理：GitHub 内容仓库 + 本地资源

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ContentFile {
  name: string
  path: string
  size: number
  type: 'file' | 'dir'
  sha: string
}

interface StorageStats {
  postsCount: number
  totalSize: number
  lastUpdated: string
  repo: string
  branch: string
}

export default function StoragePage() {
  const router = useRouter()
  const [stats, setStats]   = useState<StorageStats | null>(null)
  const [files, setFiles]   = useState<ContentFile[]>([])
  const [loading, setLoading] = useState(true)
  const [path, setPath]     = useState('posts')

  useEffect(() => {
    fetch('/api/admin/storage?path=' + path)
      .then(r => { if (r.status === 401) { router.push('/admin/login'); return null } return r.json() })
      .then(data => {
        if (data) {
          setStats(data.stats)
          setFiles(data.files ?? [])
        }
      })
      .finally(() => setLoading(false))
  }, [router, path])

  const S = { padding: '32px 36px', maxWidth: 900 }

  return (
    <div style={S}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, marginBottom: 6 }}>存储管理</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>管理 GitHub 内容仓库中的文章和资源文件</p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted-foreground)', padding: 40 }}>加载中…</div>
      ) : (
        <>
          {/* 统计卡片 */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
              {[
                { label: '文章数量', value: stats.postsCount + ' 篇', icon: '📝' },
                { label: '仓库', value: stats.repo, icon: '📦' },
                { label: '分支', value: stats.branch, icon: '🌿' },
              ].map(card => (
                <div key={card.label} style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '20px 24px',
                }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 4 }}>{card.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{card.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* 文件列表 */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>📁 {path}</span>
            </div>
            {files.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                <p>此目录为空，或存储 API 尚未配置</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--secondary)' }}>
                    {['文件名', '大小', '操作'].map(h => (
                      <th key={h} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 500, textAlign: 'left', color: 'var(--muted-foreground)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {files.map(f => (
                    <tr key={f.path} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 20px', fontSize: 14 }}>
                        {f.type === 'dir' ? '📁 ' : '📄 '}{f.name}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted-foreground)' }}>
                        {f.type === 'dir' ? '—' : (f.size / 1024).toFixed(1) + ' KB'}
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        {f.name.match(/\.(md|mdx)$/) && (
                          <a href={`/admin/edit/${f.name.replace(/\.(md|mdx)$/, '')}`}
                            style={{ fontSize: 13, color: 'var(--accent-foreground)', textDecoration: 'none' }}>编辑</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
