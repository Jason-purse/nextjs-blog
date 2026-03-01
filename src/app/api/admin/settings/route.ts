import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/auth";
import { storage } from "@/lib/storage";

const SETTINGS_FILE = "settings.json";

const DEFAULT_SETTINGS = {
  title: "AI Blog",
  supportedLanguages: ["zh", "en"],
  defaultLanguage: "zh",
  translationEnabled: false,
  translationApi: "minimax",
};

function checkAuth(request: NextRequest): boolean {
  const token = request.cookies.get("admin_token")?.value;
  return token ? validateToken(token) !== null : false;
}

// GET - retrieve blog settings
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const content = await storage.read(SETTINGS_FILE);
    if (content) {
      const settings = JSON.parse(content);
      return NextResponse.json(settings);
    }
    // Return default settings if file doesn't exist
    return NextResponse.json(DEFAULT_SETTINGS);
  } catch {
    // Return default settings on error
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

// PUT - save blog settings
export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Validate and sanitize settings
  const validApis = ["minimax", "openai", "deepl"];
  const settings = {
    title: body.title || DEFAULT_SETTINGS.title,
    supportedLanguages: Array.isArray(body.supportedLanguages)
      ? body.supportedLanguages
      : DEFAULT_SETTINGS.supportedLanguages,
    defaultLanguage:
      body.defaultLanguage && body.supportedLanguages?.includes(body.defaultLanguage)
        ? body.defaultLanguage
        : DEFAULT_SETTINGS.defaultLanguage,
    translationEnabled: Boolean(body.translationEnabled),
    translationApi: validApis.includes(body.translationApi)
      ? body.translationApi
      : DEFAULT_SETTINGS.translationApi,
  };

  await storage.write(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  return NextResponse.json({ success: true, settings });
}
