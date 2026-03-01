import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // 安全响应头
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // HSTS（仅生产环境）
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // CSP：根据路由分级设置（admin 更严，博客页面允许外部资源）
  const isAdmin = pathname.startsWith("/admin");
  const csp = isAdmin
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",    // admin 编辑器需要
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",    // 支持上传图片预览
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self'",
        "frame-ancestors 'none'",
      ].join("; ")
    : [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://giscus.app",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https://fonts.gstatic.com",
        // 允许 Giscus 评论、外��� API
        "connect-src 'self' https://giscus.app https://api.github.com",
        "frame-src https://giscus.app",
        "frame-ancestors 'none'",
      ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    // 排除静态文件和图片优化路由
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
  ],
};
