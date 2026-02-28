import matter from "gray-matter";
import readingTime from "reading-time";
import { storage } from "./storage";

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  category?: string;
  coverImage?: string;
  readingTime?: string;
  summary?: string;
}

export interface Post extends PostMeta {
  content: string;
}

function parsePost(slug: string, raw: string): Post {
  const realSlug = slug.replace(/\.mdx$/, "");
  const { data, content } = matter(raw);
  const stats = readingTime(content);
  return {
    slug: realSlug,
    title: data.title,
    date: data.date,
    description: data.description || "",
    tags: data.tags || [],
    category: data.category,
    coverImage: data.coverImage,
    summary: data.summary,
    content,
    readingTime: stats.text,
  };
}

export async function getPostSlugs(): Promise<string[]> {
  const files = await storage.list("posts");
  return files.filter((f) => f.endsWith(".mdx"));
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const realSlug = slug.replace(/\.mdx$/, "");
  const raw = await storage.read(`posts/${realSlug}.mdx`);
  if (!raw) throw new Error(`Post not found: ${realSlug}`);
  return parsePost(realSlug, raw);
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const slugs = await getPostSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const post = await getPostBySlug(slug);
      const { content: _, ...meta } = post;
      return meta;
    })
  );
  return posts.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export async function getFeaturedPosts(count = 3): Promise<PostMeta[]> {
  const posts = await getAllPosts();
  return posts.slice(0, count);
}

export async function getPostsByTag(tag: string): Promise<PostMeta[]> {
  const posts = await getAllPosts();
  return posts.filter((p) => p.tags.includes(tag));
}

export async function getAllTags(): Promise<string[]> {
  const posts = await getAllPosts();
  const tags = new Set<string>();
  posts.forEach((p) => p.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}

export async function getAllCategories(): Promise<string[]> {
  const posts = await getAllPosts();
  const cats = new Set<string>();
  posts.forEach((p) => { if (p.category) cats.add(p.category); });
  return Array.from(cats).sort();
}

export async function getPostsByCategory(category: string): Promise<PostMeta[]> {
  const posts = await getAllPosts();
  return posts.filter((p) => p.category === category);
}

export async function getCategoryPostCount(category: string): Promise<number> {
  const posts = await getAllPosts();
  return posts.filter((p) => p.category === category).length;
}
