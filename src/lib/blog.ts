// ============================================================
// Blog Library - 使用旧版兼容逻辑 (临时修复)
// ============================================================

import matter from "gray-matter";
import readingTime from "reading-time";
import { storage } from "./storage";
import { processPost, TransformerMetadata } from "./transformer-pipeline";

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  category?: string;
  coverImage?: string;
  author?: string;
  readingTime?: string;
  summary?: string;
  wordCount?: number;
  readTimeMinutes?: number;
  toc?: Array<{ id: string; text: string; level: number }>;
  codeBlockCount?: number;
  imageCount?: number;
  excerpt?: string;
}

export interface Post extends PostMeta {
  content: string;
  renderInjections?: string;
}

async function parsePost(slug: string, raw: string): Promise<Post> {
  const realSlug = slug.replace(/\.mdx$/, "");
  const { data, content } = matter(raw);
  
  const pipelineResult = await processPost(realSlug, content, data)
  const meta = pipelineResult.metadata
  const stats = readingTime(content);
  
  return {
    slug: realSlug,
    title: data.title,
    date: data.date,
    description: data.description || meta.excerpt || "",
    tags: data.tags || [],
    category: data.category,
    coverImage: data.coverImage,
    author: data.author,
    summary: data.summary,
    content: pipelineResult.content,
    readingTime: stats.text,
    wordCount: meta.wordCount,
    readTimeMinutes: meta.readTimeMinutes,
    toc: meta.toc,
    codeBlockCount: meta.codeBlocks?.length,
    imageCount: meta.images?.length,
    excerpt: meta.excerpt,
    renderInjections: meta._renderInjections?.join('\n')
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
      const { content: _, renderInjections: __, ...meta } = post;
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
