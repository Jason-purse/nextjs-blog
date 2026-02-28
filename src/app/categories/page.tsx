import Link from "next/link";
import { Header } from "@/components/header";
import { getAllCategories } from "@/lib/categories";

export default async function CategoriesPage() {
  const categories = await getAllCategories();

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-12">
          <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
            Categories
          </h1>
          <p className="mt-2 text-muted-foreground">
            Browse posts by topic
          </p>
        </div>

        {categories.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No categories yet. Add categories to your posts.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:border-accent hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-xl font-semibold transition-colors group-hover:text-accent">
                      {category.name}
                    </h2>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-medium text-muted-foreground">
                      {category.postCount}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {category.postCount === 1
                      ? "1 article"
                      : `${category.postCount} articles`}
                  </p>
                  <div className="mt-4 h-px w-full bg-border transition-colors group-hover:bg-accent/30" />
                </div>
              </Link>
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
