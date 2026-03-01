// ============================================================
// Blog Library - 完全使用 Pipeline 架构
// ============================================================

import readingTime from "reading-time";
import { createPipeline } from "./pipeline/engine";
import { StorageSource } from "./pipeline/plugins/source-storage";
import { MarkdownParser, ReadingTimeTransformer, TocTransformer, ExcerptTransformer } from "./pipeline/plugins/parser-markdown";
import type { ContentNode, PluginContext } from '@/types/pipeline';

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

// Pipeline 单例
let pipelineInstance: ReturnType<typeof createPipeline> | null = null;

// 默认 logger
const defaultLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
};

function getPipeline() {
  if (!pipelineInstance) {
    pipelineInstance = createPipeline({
      sources: [new StorageSource({ prefix: 'posts', extensions: ['.md', '.mdx'] })],
      parsers: [new MarkdownParser()],
      transformers: [
        new ReadingTimeTransformer(),
        new TocTransformer(),
        new ExcerptTransformer()
      ],
      emitters: [],
      hooks: []
    }, defaultLogger);
  }
  return pipelineInstance;
}

// 转换 ContentNode 到 Post
function nodeToPost(node: ContentNode): Post {
  const content = node.body;
  const stats = readingTime(content);
  
  return {
    slug: node.slug,
    title: (node.frontmatter.title as string) || node.slug,
    date: (node.frontmatter.date as string) || new Date().toISOString(),
    description: (node.frontmatter.description as string) || node.excerpt || "",
    tags: (node.frontmatter.tags as string[]) || [],
    category: node.frontmatter.category as string | undefined,
    coverImage: node.frontmatter.coverImage as string | undefined,
    author: node.frontmatter.author as string | undefined,
    summary: node.frontmatter.summary as string | undefined,
    content,
    readingTime: stats.text,
    wordCount: node.frontmatter.wordCount as number | undefined,
    readTimeMinutes: node.readingTime,
    toc: node.toc?.map(t => ({ id: t.id, text: t.text, level: t.depth })),
    excerpt: node.excerpt
  };
}

// ============================================================
// 公开 API
// ============================================================

export async function getPostSlugs(): Promise<string[]> {
  const pipeline = getPipeline();
  const nodes = await pipeline.run();
  return nodes.map((n: ContentNode) => n.slug);
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const pipeline = getPipeline();
  const nodes = await pipeline.run();
  const node = nodes.find((n: ContentNode) => n.slug === slug);
  if (!node) throw new Error(`Post not found: ${slug}`);
  return nodeToPost(node);
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const pipeline = getPipeline();
  const nodes = await pipeline.run();
  return nodes
    .map((node: ContentNode) => {
      const post = nodeToPost(node);
      const { content: _, renderInjections: __, ...meta } = post;
      return meta;
    })
    .sort((a: PostMeta, b: PostMeta) => (a.date > b.date ? -1 : 1));
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
