import Link from "next/link";
import { Header } from "@/components/header";
import { getAllPosts, getAllTags } from "@/lib/blog";

interface BlogPageProps {
  searchParams: Promise<{ tag?: string; q?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const tag = params.tag;
  const query = params.q;

  let posts = getAllPosts();
  const allTags = getAllTags();

  // Filter by tag
  if (tag) {
    posts = posts.filter((post) => post.tags.includes(tag));
  }

  // Filter by search query
  if (query) {
    const lowerQuery = query.toLowerCase();
    posts = posts.filter(
      (post) =>
        post.title.toLowerCase().includes(lowerQuery) ||
        post.description.toLowerCase().includes(lowerQuery) ||
        post.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-12">
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
            Blog
          </h1>
          <p className="mt-2 text-muted-foreground">
            Thoughts on code, mindfulness, and the art of simple living.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form className="relative w-full sm:w-72">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search posts..."
              className="w-full rounded-md border border-border bg-background px-4 py-2 pl-10 text-sm transition-colors focus:border-primary focus:outline-none"
            />
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </form>
        </div>

        {/* Tags */}
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href="/blog"
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              !tag
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            All
          </Link>
          {allTags.map((t) => (
            <Link
              key={t}
              href={`/blog?tag=${t}`}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                tag === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>

        {/* Posts List */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              No posts found. Try a different search or tag.
            </p>
          ) : (
            posts.map((post) => (
              <article
                key={post.slug}
                className="group border-b border-border pb-6 last:border-0"
              >
                <Link href={`/blog/${post.slug}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <time dateTime={post.date}>
                          {new Date(post.date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                        <span>·</span>
                        <span>{post.readingTime}</span>
                      </div>
                      <h2 className="mt-1 font-serif text-xl font-semibold transition-colors group-hover:text-primary">
                        {post.title}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {post.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs text-muted-foreground"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Zen Blog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
