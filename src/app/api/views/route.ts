import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

const VIEWS_FILE = "views.json";

interface Views {
  [slug: string]: number;
}

async function readViews(): Promise<Views> {
  try {
    const raw = await storage.read(VIEWS_FILE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeViews(views: Views): Promise<void> {
  await storage.write(VIEWS_FILE, JSON.stringify(views, null, 2));
}

export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Slug is required" }, { status: 400 });

  const views = await readViews();
  return NextResponse.json({ slug, count: views[slug] || 0 });
}

export async function POST(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Slug is required" }, { status: 400 });

  const views = await readViews();
  views[slug] = (views[slug] || 0) + 1;
  await writeViews(views);

  return NextResponse.json({ slug, count: views[slug] });
}
