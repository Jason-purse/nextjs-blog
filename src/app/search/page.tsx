import { getAllPosts } from "@/lib/blog";
import { SearchClient } from "@/components/search-client";
import { Header } from "@/components/header";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const posts = getAllPosts();

  return (
    <>
      <Header />
      <SearchClient initialPosts={posts} initialQuery={params.q || ""} />
    </>
  );
}
