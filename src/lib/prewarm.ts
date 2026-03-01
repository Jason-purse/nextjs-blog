// src/lib/prewarm.ts
// 主动预热博客页面缓存，让所有用户第一次访问就拿到新版本

async function getAllSlugs(): Promise<string[]> {
  const repo   = process.env.GITHUB_CONTENT_REPO
  const branch = process.env.GITHUB_CONTENT_BRANCH ?? 'main'
  const token  = process.env.GITHUB_TOKEN
  if (!repo) return []

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/posts?ref=${branch}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        cache: 'no-store',
      }
    )
    if (!res.ok) return []
    const files: { name: string }[] = await res.json()
    return files
      .filter(f => f.name.match(/\.(md|mdx)$/))
      .map(f => f.name.replace(/\.(md|mdx)$/, ''))
  } catch {
    return []
  }
}

export async function prewarmAllPosts(baseUrl: string) {
  const slugs = await getAllSlugs()
  const urls = [
    baseUrl,
    `${baseUrl}/blog`,
    ...slugs.map(s => `${baseUrl}/blog/${s}`),
  ]

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  await Promise.allSettled(
    urls.map(url =>
      fetch(url, {
        signal: controller.signal,
        headers: { 'purpose': 'prefetch' },
      }).catch(() => null)
    )
  )
  clearTimeout(timeout)
}
