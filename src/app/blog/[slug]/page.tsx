import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { getPostBySlug, getAllPosts } from "@/lib/blog";
import { MDXContent } from "@/components/mdx-content";

function countWords(content: string): number {
  const cn = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (content.replace(/[\u4e00-\u9fa5]/g, '').match(/\b\w+\b/g) || []).length
  return cn + en
}

// ISR：30秒后重新生成，插件开关 30s 内生效
export const revalidate = 30;
import { CommentSection } from "@/components/comment-section";
import { ViewCount } from "@/components/view-count";
import { AISummary } from "@/components/ai-summary";
import { GiscusComments } from "@/components/giscus-comments";
import { isPluginEnabled } from "@/lib/plugin-settings";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  try {
    const post = await getPostBySlug(slug);
    return {
      title: post.title,
      description: post.description,
      openGraph: {
        title: post.title,
        description: post.description,
        type: "article",
        publishedTime: post.date,
        tags: post.tags,
      },
    };
  } catch {
    return { title: "Post Not Found" };
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  let post;
  try {
    post = await getPostBySlug(slug);
  } catch {
    notFound();
  }

  const allPosts = await getAllPosts();
  const aiSummaryEnabled   = await isPluginEnabled('ai-summary')
  const giscusEnabled      = await isPluginEnabled('giscus-comments')
  const currentIndex = allPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

  // Extract headings for TOC
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings: { level: number; text: string; id: string }[] = [];
  let match;
  while ((match = headingRegex.exec(post.content)) !== null) {
    const text = match[2].trim();
    headings.push({
      level: match[1].length,
      text,
      id: text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    });
  }

  const wordCount = countWords(post.content)
  const readTimeMins = Math.max(1, Math.ceil(wordCount / 250))

  return (
    <div className="min-h-screen">
      <Header />

      {/* Plugin Context：注入文章上下文供插件使用 */}
      <script dangerouslySetInnerHTML={{ __html: `window.__BLOG_CONTENT_CTX__=${JSON.stringify({
        slug: post.slug,
        title: post.title,
        tags: post.tags || [],
        category: post.category || '',
        wordCount,
        readTimeMins,
        publishedAt: post.date || '',
        toc: headings.map((h, i) => ({
          id: h.id || h.text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '') + '-' + i,
          text: h.text,
          level: h.level
        }))
      })}` }} />

      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
          {/* Article */}
          <article>
            {/* Meta */}
            <div className="mb-8">
              <Link
                href="/blog"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                ← Back to Blog
              </Link>
              <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                {post.title}
              </h1>
              <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                <span>·</span>
                <span>{post.readingTime}</span>
                <span>·</span>
                <ViewCount slug={slug} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog?tag=${tag}`}
                    className="rounded-full bg-secondary px-3 py-1 text-xs transition-colors hover:bg-secondary/80"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* AI Summary — 受插件开关控制 */}
            {aiSummaryEnabled && <AISummary summary={post.summary || ""} />}

            {/* Content */}
            <div className="prose">
              <MDXContent source={post.content} />
            </div>

            {/* Prev/Next */}
            <nav className="mt-16 grid gap-4 border-t border-border pt-8 sm:grid-cols-2">
              {prevPost ? (
                <Link
                  href={`/blog/${prevPost.slug}`}
                  className="group rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
                >
                  <span className="text-xs text-muted-foreground">← Previous</span>
                  <p className="mt-1 font-serif font-semibold transition-colors group-hover:text-primary">
                    {prevPost.title}
                  </p>
                </Link>
              ) : (
                <div />
              )}
              {nextPost ? (
                <Link
                  href={`/blog/${nextPost.slug}`}
                  className="group rounded-lg border border-border p-4 text-right transition-colors hover:bg-secondary"
                >
                  <span className="text-xs text-muted-foreground">Next →</span>
                  <p className="mt-1 font-serif font-semibold transition-colors group-hover:text-primary">
                    {nextPost.title}
                  </p>
                </Link>
              ) : (
                <div />
              )}
            </nav>

            {/* Comments — 受插件开关控制 */}
            {giscusEnabled && <GiscusComments identifier={`/blog/${slug}`} />}
          </article>

          {/* Table of Contents - Desktop */}
          {headings.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  On this page
                </h3>
                <nav className="space-y-2">
                  {headings.map((heading) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      className={`block text-sm text-muted-foreground transition-colors hover:text-foreground ${
                        heading.level === 3 ? "pl-4" : ""
                      }`}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AI Blog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
