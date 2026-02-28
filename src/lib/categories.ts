import { getAllPosts, getPostsByCategory, getCategoryPostCount } from "./blog";

export interface Category {
  name: string;
  slug: string;
  postCount: number;
}

export function getAllCategories(): Category[] {
  const posts = getAllPosts();
  const categoryMap = new Map<string, number>();

  posts.forEach((post) => {
    if (post.category) {
      categoryMap.set(
        post.category,
        (categoryMap.get(post.category) || 0) + 1
      );
    }
  });

  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      postCount: count,
    }))
    .sort((a, b) => b.postCount - a.postCount);
}

export function getPostsByCategorySlug(categorySlug: string) {
  const categories = getAllCategories();
  const category = categories.find((c) => c.slug === categorySlug);

  if (!category) {
    return null;
  }

  return getPostsByCategory(category.name);
}

export { getCategoryPostCount };
