"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { PostMeta } from "@/lib/blog";

interface SearchClientProps {
  initialPosts: PostMeta[];
  initialQuery?: string;
}

export function SearchClient({ initialPosts, initialQuery = "" }: SearchClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredPosts = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return initialPosts.filter((post) => {
      const titleMatch = post.title.toLowerCase().includes(lowerQuery);
      const descMatch = post.description.toLowerCase().includes(lowerQuery);
      const tagMatch = post.tags.some((tag) =>
        tag.toLowerCase().includes(lowerQuery)
      );
      const categoryMatch = post.category
        ? post.category.toLowerCase().includes(lowerQuery)
        : false;

      return titleMatch || descMatch || tagMatch || categoryMatch;
    });
  }, [initialPosts, query]);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-12">
          <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
            Search
          </h1>
          <p className="mt-2 text-muted-foreground">
            Find articles by title, description, tags, or category
          </p>
        </div>

        {/* Search Input */}
        <div className="mb-12">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full rounded-lg border border-border bg-card py-4 pl-12 pr-4 text-lg font-body transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </div>
        </div>

        {/* Search Results */}
        {mounted && (
          <div>
            {query.trim() === "" ? (
              <p className="text-center text-muted-foreground py-12">
                Enter a search term to find articles
              </p>
            ) : filteredPosts.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No articles found for &quot;{query}&quot;
              </p>
            ) : (
              <>
                <p className="mb-6 text-sm text-muted-foreground">
                  Found {filteredPosts.length}{" "}
                  {filteredPosts.length === 1 ? "article" : "articles"}
                </p>
                <div className="space-y-8">
                  {filteredPosts.map((post, index) => (
                    <article
                      key={post.slug}
                      className="animate-fade-in border-b border-border pb-8 last:border-0"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <Link href={`/blog/${post.slug}`} className="group">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {post.category && (
                                <>
                                  <span className="category-pill">
                                    {post.category}
                                  </span>
                                  <span>·</span>
                                </>
                              )}
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
              </>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AI Blog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
