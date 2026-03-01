import { getAllTags, getPostsByTag } from '@/lib/blog'
import { Header } from '@/components/header'
import Link from 'next/link'

export const revalidate = 60

export async function generateStaticParams() {
  const tags = await getAllTags()
  return tags.map(tag => ({ tag }))
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)
  const posts = await getPostsByTag(decodedTag)

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <Link href="/tags" className="text-muted-foreground hover:text-foreground">
            ← 所有标签
          </Link>
        </div>
        
        <h1 className="font-serif text-4xl font-bold mb-4">
          标签: <span className="text-primary">#{decodedTag}</span>
        </h1>
        <p className="text-muted-foreground mb-12">{posts.length} 篇文章</p>
        
        <ul className="space-y-4">
          {posts.map(post => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="block p-4 rounded-lg border border-border hover:bg-secondary transition-colors">
                <div className="font-semibold text-lg mb-1">{post.title}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(post.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })} · {post.readingTime}
                </div>
              </Link>
            </li>
          ))}
          
          {posts.length === 0 && (
            <p className="text-muted-foreground">暂无文章</p>
          )}
        </ul>
      </main>
    </div>
  )
}
