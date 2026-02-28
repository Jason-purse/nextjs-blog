import Link from "next/link";
import { Header } from "@/components/header";
import { getFeaturedPosts } from "@/lib/blog";

export default async function Home() {
  const featuredPosts = await getFeaturedPosts(3);

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="mx-auto max-w-5xl px-4">
            <div className="max-w-2xl">
              <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                <span className="animate-fade-in inline-block">
                  Finding clarity
                </span>
                <span className="animate-fade-in inline-block delay-100">
                  {" "}
                  in code,
                </span>
                <br />
                <span className="animate-fade-in inline-block delay-200">
                  stillness in life.
                </span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                A space where technology meets mindfulness. Writing about
                software development, mindful living, and the art of simplicity.
              </p>
              <div className="mt-8 flex gap-4">
                <Link
                  href="/blog"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Read the Blog
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  About Me
                </Link>
              </div>
            </div>
          </div>

          {/* Decorative element */}
          <div className="absolute -right-32 top-1/2 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        </section>

        {/* Featured Posts */}
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-semibold">Recent Posts</h2>
              <Link
                href="/blog"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                View all →
              </Link>
            </div>

            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPosts.map((post, index) => (
                <article
                  key={post.slug}
                  className="group animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Link href={`/blog/${post.slug}`}>
                    <div className="overflow-hidden rounded-lg border border-border bg-card">
                      <div className="aspect-video bg-secondary" />
                      <div className="p-5">
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
                        <h3 className="mt-2 font-serif text-lg font-semibold transition-colors group-hover:text-primary">
                          {post.title}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {post.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {post.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-secondary px-2 py-1 text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* About Preview */}
        <section className="border-t border-border py-16">
          <div className="mx-auto max-w-5xl px-4">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="font-serif text-2xl font-semibold">
                  Simplicity is the ultimate sophistication
                </h2>
                <p className="mt-4 text-muted-foreground">
                  I believe in the power of minimalism—both in code and in life.
                  This blog is my attempt to document that journey and share
                  what I&apos;ve learned along the way.
                </p>
                <Link
                  href="/about"
                  className="mt-4 inline-flex items-center text-sm font-medium transition-colors hover:text-primary"
                >
                  Learn more about me →
                </Link>
              </div>
              <div className="flex justify-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-secondary">
                  <span className="font-serif text-4xl">禅</span>
                </div>
              </div>
            </div>
          </div>
        </section>
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
