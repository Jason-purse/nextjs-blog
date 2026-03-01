import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/auth";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { storage } from "@/lib/storage";

const POSTS_DIR = "posts";

function checkAuth(request: NextRequest): boolean {
  const token = request.cookies.get("admin_token")?.value;
  return token ? validateToken(token) !== null : false;
}

// GET - list all posts or get single post
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug");

  if (slug) {
    try {
      const post = await getPostBySlug(slug);
      const raw = await storage.read(`${POSTS_DIR}/${slug}.mdx`);
      return NextResponse.json({ ...post, raw: raw || "" });
    } catch {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
  }

  const posts = await getAllPosts();
  return NextResponse.json(posts);
}

// POST - create new post
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, title, description, tags, content } = await request.json();

  if (!slug || !title || !content) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const filePath = `${POSTS_DIR}/${slug}.mdx`;
  const exists = await storage.exists(filePath);
  if (exists) {
    return NextResponse.json({ error: "Post already exists" }, { status: 409 });
  }

  const frontmatter = `---
title: "${title}"
date: "${new Date().toISOString().split("T")[0]}"
description: "${description || ""}"
tags: [${(tags || []).map((t: string) => `"${t}"`).join(", ")}]
---

${content}`;

  await storage.write(filePath, frontmatter);
  return NextResponse.json({ success: true, slug });
}

// PUT - update existing post
export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, title, description, date, tags, content } = await request.json();

  const filePath = `${POSTS_DIR}/${slug}.mdx`;
  const exists = await storage.exists(filePath);
  if (!exists) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const frontmatter = `---
title: "${title}"
date: "${date || new Date().toISOString().split("T")[0]}"
description: "${description || ""}"
tags: [${(tags || []).map((t: string) => `"${t}"`).join(", ")}]
---

${content}`;

  await storage.write(filePath, frontmatter);
  return NextResponse.json({ success: true });
}

// DELETE - delete post
export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const filePath = `${POSTS_DIR}/${slug}.mdx`;
  const exists = await storage.exists(filePath);
  if (!exists) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await storage.delete(filePath);
  return NextResponse.json({ success: true });
}
