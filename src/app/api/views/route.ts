import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const viewsFilePath = path.join(process.cwd(), "content/views.json");

interface Views {
  [slug: string]: number;
}

function readViews(): Views {
  if (!fs.existsSync(viewsFilePath)) {
    return {};
  }
  const data = fs.readFileSync(viewsFilePath, "utf8");
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function writeViews(views: Views): void {
  fs.writeFileSync(viewsFilePath, JSON.stringify(views, null, 2));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  const views = readViews();
  const count = views[slug] || 0;

  return NextResponse.json({ slug, count });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  const views = readViews();
  views[slug] = (views[slug] || 0) + 1;
  writeViews(views);

  return NextResponse.json({ slug, count: views[slug] });
}
