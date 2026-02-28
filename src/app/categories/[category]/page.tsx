import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { getAllCategories, getPostsByCategorySlug } from "@/lib/categories";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { category } = await params;
  const categories = await getAllCategories();
  const foundCategory = categories.find((c) => c.slug === category);
  if (!foundCategory) return { title: "Category Not Found" };
  return {
    title: `${foundCategory.name} | Categories`,
    description: `Browse all ${foundCategory.name} articles`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const categories = await getAllCategories();
  const foundCategory = categories.find((c) => c.slug === category);
  if (!foundCategory) notFound();
  const posts = await getPostsByCategorySlug(category);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-12">
          <Link
            href="/categories"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← All Categories
          </Link>
          <h1 className="mt-4 font-heading text-3xl font-semibold sm:text-4xl">
            {foundCategory.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {posts?.length || 0}{" "}
            {posts?.length === 1 ? "article" : "articles"}
          </p>
        </div>

        {!posts || posts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No articles in this category yet.
          </p>
        ) : (
          <div className="space-y-8">
            {posts.map((post, index) => (
              <article
                key={post.slug}
                className="animate-fade-in border-b border-border pb-8 last:border-0"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Link href={`/blog/${post.slug}`} className="group">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                      <h2 className="mt-2 font-heading text-xl font-semibold transition-colors group-hover:text-accent">
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
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Zen Blog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
