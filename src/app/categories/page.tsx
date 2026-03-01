import { getAllPosts, getAllCategories, getPostsByCategory } from '@/lib/blog'
import { Header } from '@/components/header'
import Link from 'next/link'

export const revalidate = 60

export default async function CategoriesPage() {
  const categories = await getAllCategories()
  const categoryPosts = await Promise.all(
    categories.map(async (cat) => ({
      category: cat,
      posts: await getPostsByCategory(cat)
    }))
  )

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="font-serif text-4xl font-bold mb-12">分类</h1>
        
        <div className="space-y-12">
          {categoryPosts.map(({ category, posts }) => (
            <section key={category}>
              <h2 className="text-2xl font-semibold mb-4 pb-2 border-b border-border">
                {category} <span className="text-muted-foreground text-lg font-normal">({posts.length})</span>
              </h2>
              <ul className="space-y-3">
                {posts.map(post => (
                  <li key={post.slug}>
                    <Link href={`/blog/${post.slug}`} className="flex items-center gap-3 group">
                      <span className="text-muted-foreground text-sm w-24">
                        {new Date(post.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="group-hover:text-primary transition-colors">{post.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          
          {categories.length === 0 && (
            <p className="text-muted-foreground">暂无分类</p>
          )}
        </div>
      </main>
    </div>
  )
}
