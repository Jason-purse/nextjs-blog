import { getAllPosts } from '@/lib/blog'
import { Header } from '@/components/header'
import Link from 'next/link'

export const revalidate = 60

export default async function ArchivesPage() {
  const posts = await getAllPosts()
  
  // 按年份分组
  const byYear: Record<string, typeof posts> = {}
  posts.forEach(post => {
    const year = new Date(post.date).getFullYear().toString()
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(post)
  })

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a))

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="font-serif text-4xl font-bold mb-12">归档</h1>
        
        <div className="space-y-12">
          {years.map(year => (
            <section key={year}>
              <h2 className="text-2xl font-semibold mb-4 pb-2 border-b border-border">
                {year} <span className="text-muted-foreground text-lg font-normal">({byYear[year].length} 篇)</span>
              </h2>
              <ul className="space-y-3">
                {byYear[year].map(post => (
                  <li key={post.slug}>
                    <Link href={`/blog/${post.slug}`} className="flex items-center gap-3 group">
                      <span className="text-muted-foreground text-sm w-20">
                        {new Date(post.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="group-hover:text-primary transition-colors">{post.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
