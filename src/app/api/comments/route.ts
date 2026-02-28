import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const commentsFilePath = path.join(process.cwd(), "content/comments.json");

interface Comment {
  slug: string;
  author: string;
  content: string;
  date: string;
}

function readComments(): Comment[] {
  if (!fs.existsSync(commentsFilePath)) {
    return [];
  }
  const data = fs.readFileSync(commentsFilePath, "utf8");
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeComments(comments: Comment[]): void {
  fs.writeFileSync(commentsFilePath, JSON.stringify(comments, null, 2));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  const comments = readComments();
  const postComments = comments.filter((c) => c.slug === slug);

  return NextResponse.json(postComments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, author, content } = body;

  if (!slug || !author || !content) {
    return NextResponse.json(
      { error: "Slug, author, and content are required" },
      { status: 400 }
    );
  }

  const comments = readComments();
  const newComment: Comment = {
    slug,
    author,
    content,
    date: new Date().toISOString(),
  };

  comments.push(newComment);
  writeComments(comments);

  return NextResponse.json(newComment, { status: 201 });
}
