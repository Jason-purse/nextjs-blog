import { getAllTags, getAllPosts } from '@/lib/blog'
import { Header } from '@/components/header'
import Link from 'next/link'

export const revalidate = 60

export default async function TagsPage() {
  const tags = await getAllTags()
  const posts = await getAllPosts()
  
  // 统计每个标签的文章数
  const tagCount: Record<string, number> = {}
  posts.forEach(post => {
    post.tags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1
    })
  })

  const sortedTags = tags.sort((a, b) => (tagCount[b] || 0) - (tagCount[a] || 0))

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="font-serif text-4xl font-bold mb-12">标签</h1>
        
        <div className="flex flex-wrap gap-3">
          {sortedTags.map(tag => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <span>#</span>
              <span>{tag}</span>
              <span className="text-xs opacity-60">({tagCount[tag] || 0})</span>
            </Link>
          ))}
          
          {tags.length === 0 && (
            <p className="text-muted-foreground">暂无标签</p>
          )}
        </div>
      </main>
    </div>
  )
}
