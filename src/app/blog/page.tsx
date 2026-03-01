import Link from "next/link"
import { Header } from "@/components/header"
import { getAllPosts, getAllTags } from "@/lib/blog"
import { Card, Badge, Input, Button } from "@/components/ui"

// 配置
const POSTS_PER_PAGE = 6

// 搜索框组件
function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form className="relative">
      <Input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="搜索文章..."
        className="pl-10"
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </form>
  )
}

// 标签筛选
function TagFilter({ tags, activeTag }: { tags: string[]; activeTag?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/blog"
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          !activeTag
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-secondary/50 hover:bg-secondary"
        }`}
      >
        全部
      </Link>
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/blog?tag=${tag}`}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            activeTag === tag
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary/50 hover:bg-secondary"
          }`}
        >
          #{tag}
        </Link>
      ))}
    </div>
  )
}

// 文章卡片
function PostCard({ post }: { post: any }) {
  return (
    <Link href={`/blog/${post.slug}`} className="block">
      <Card className="group transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-1">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric", year: "numeric" })}
              </time>
              <span>·</span>
              <span>{post.readingTime}</span>
            </div>
            <h2 className="font-serif text-xl font-semibold group-hover:text-primary transition-colors truncate">
              {post.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {post.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}

// 分页
function Pagination({ current, total, baseUrl }: { current: number; total: number; baseUrl: string }) {
  if (total <= 1) return null
  
  const getUrl = (page: number) => `${baseUrl}?page=${page}`
  
  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      {current > 1 && (
        <Link href={getUrl(current - 1)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">
          上一页
        </Link>
      )}
      <span className="text-sm text-muted-foreground px-4">
        {current} / {total}
      </span>
      {current < total && (
        <Link href={getUrl(current + 1)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">
          下一页
        </Link>
      )}
    </div>
  )
}

// 空状态
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-4">📭</div>
      <h3 className="text-lg font-medium mb-2">暂无文章</h3>
      <p className="text-sm text-muted-foreground">试试其他标签或搜索词</p>
    </div>
  )
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string; page?: string }>
}) {
  const params = await searchParams
  const tag = params.tag
  const query = params.q
  const page = parseInt(params.page || "1", 10)

  // 获取数据
  let posts = await getAllPosts()
  const tags = await getAllTags()

  // 筛选
  if (tag) posts = posts.filter((p) => p.tags.includes(tag))
  if (query) {
    const q = query.toLowerCase()
    posts = posts.filter(
      (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    )
  }

  // 分页
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE)
  const paginatedPosts = posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE)

  // 构建基础 URL
  const baseUrl = tag ? `/blog?tag=${tag}` : "/blog"

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-serif text-4xl font-bold mb-3">文章</h1>
          <p className="text-muted-foreground">关于代码、思考与生活的记录</p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="w-full sm:w-72">
            <SearchBox defaultValue={query} />
          </div>
        </div>

        <TagFilter tags={tags} activeTag={tag} />

        {/* Posts */}
        <div className="mt-8 space-y-4">
          {paginatedPosts.length === 0 ? (
            <EmptyState />
          ) : (
            paginatedPosts.map((post) => <PostCard key={post.slug} post={post} />)
          )}
        </div>

        <Pagination current={page} total={totalPages} baseUrl={baseUrl} />
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AI Blog
        </div>
      </footer>
    </div>
  )
}
