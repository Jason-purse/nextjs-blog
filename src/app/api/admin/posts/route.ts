import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/auth";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import fs from "fs";
import path from "path";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

function checkAuth(request: NextRequest): boolean {
  const token = request.cookies.get("admin_token")?.value;
  return token ? validateToken(token) : false;
}

// GET - list all posts or get single post
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug");

  if (slug) {
    try {
      const post = getPostBySlug(slug);
      const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
      const raw = fs.readFileSync(filePath, "utf-8");
      return NextResponse.json({ ...post, raw });
    } catch {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
  }

  const posts = getAllPosts();
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

  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  if (fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Post already exists" }, { status: 409 });
  }

  const frontmatter = `---
title: "${title}"
date: "${new Date().toISOString().split("T")[0]}"
description: "${description || ""}"
tags: [${(tags || []).map((t: string) => `"${t}"`).join(", ")}]
---

${content}`;

  fs.writeFileSync(filePath, frontmatter);
  return NextResponse.json({ success: true, slug });
}

// PUT - update existing post
export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, title, description, date, tags, content } = await request.json();

  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const frontmatter = `---
title: "${title}"
date: "${date || new Date().toISOString().split("T")[0]}"
description: "${description || ""}"
tags: [${(tags || []).map((t: string) => `"${t}"`).join(", ")}]
---

${content}`;

  fs.writeFileSync(filePath, frontmatter);
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

  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  fs.unlinkSync(filePath);
  return NextResponse.json({ success: true });
}
