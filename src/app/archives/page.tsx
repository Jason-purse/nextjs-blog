import Link from "next/link";
import { Header } from "@/components/header";
import { getAllPosts } from "@/lib/blog";

interface YearMonth {
  year: number;
  month: number;
  monthName: string;
  posts: {
    slug: string;
    title: string;
    date: string;
  }[];
}

function groupPostsByYearMonth(posts: ReturnType<typeof getAllPosts>): YearMonth[] {
  const groups: Map<string, YearMonth> = new Map();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  posts.forEach((post) => {
    const date = new Date(post.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    if (!groups.has(key)) {
      groups.set(key, {
        year: date.getFullYear(),
        month: date.getMonth(),
        monthName: monthNames[date.getMonth()],
        posts: [],
      });
    }

    groups.get(key)!.posts.push({
      slug: post.slug,
      title: post.title,
      date: post.date,
    });
  });

  // Sort posts within each month by date (newest first)
  groups.forEach((group) => {
    group.posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  // Sort groups by date (newest first)
  return Array.from(groups.values()).sort(
    (a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    }
  );
}

export default function ArchivesPage() {
  const posts = getAllPosts();
  const groupedPosts = groupPostsByYearMonth(posts);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-12">
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
            Archives
          </h1>
          <p className="mt-2 text-muted-foreground">
            All blog posts grouped by year and month.
          </p>
        </div>

        <div className="space-y-12">
          {groupedPosts.map((group) => (
            <div key={`${group.year}-${group.month}`}>
              <h2 className="font-serif text-2xl font-semibold">
                {group.monthName} {group.year}
              </h2>
              <ul className="mt-4 space-y-3">
                {group.posts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex items-center gap-3"
                    >
                      <time
                        dateTime={post.date}
                        className="text-sm text-muted-foreground w-28"
                      >
                        {new Date(post.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                      <span className="transition-colors group-hover:text-primary">
                        {post.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Zen Blog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
