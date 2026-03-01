import { NextRequest, NextResponse } from "next/server";
import { validateCredentials, generateToken } from "@/lib/auth";

// 速率限制：按 IP 追踪连续失败次数（只计失败，成功登录重置）
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 锁定 15 分钟

// 定期清理过期记录防内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of failedAttempts.entries()) {
    if (now > record.lockedUntil) failedAttempts.delete(ip);
  }
}, 5 * 60 * 1000);

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isLocked(ip: string): boolean {
  const record = failedAttempts.get(ip);
  if (!record) return false;
  if (Date.now() > record.lockedUntil) {
    failedAttempts.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const record = failedAttempts.get(ip);
  if (!record || Date.now() > record.lockedUntil) {
    failedAttempts.set(ip, { count: 1, lockedUntil: Date.now() + LOCKOUT_MS });
  } else {
    record.count++;
  }
}

function resetFailures(ip: string): void {
  failedAttempts.delete(ip);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // 先检查是否已锁定
  if (isLocked(ip)) {
    const record = failedAttempts.get(ip)!;
    const retryAfter = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many failed attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username = "", password = "" } = body;

  if (!validateCredentials(username, password)) {
    recordFailure(ip); // 只有失败才计数
    const record = failedAttempts.get(ip);
    const remaining = MAX_ATTEMPTS - (record?.count ?? 0);
    return NextResponse.json(
      { error: "Invalid credentials", attemptsRemaining: Math.max(0, remaining) },
      { status: 401 }
    );
  }

  // 登录成功：重置失败记录
  resetFailures(ip);

  const token = generateToken(username);
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 86400,
    path: "/",
  });

  return response;
}
