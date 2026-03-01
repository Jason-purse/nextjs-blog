import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── CSP 策略设计 ────────────────────────────────────────────────
//
// 原则：最小权限，按路由分级
//
// 外部资源白名单：
//   - fonts.googleapis.com / fonts.gstatic.com：主题插件使用 Google Fonts（字体非可执行）
//   - giscus.app：评论系统（frame + connect）
//   - api.github.com：仅 connect（storage fallback）
//
// 已本地化（不需要 CDN 白名单）：
//   - highlight.js：安装时从 cdnjs 下载到 installed-plugins/code-highlight/cdn/
//     运行时通过 /api/registry/asset 同源提供，script-src 无需 cdnjs.cloudflare.com
//
// ────────────────────────────────────────────────────────────────

const BLOG_CSP = [
  "default-src 'self'",
  // 插件 WC 脚本通过 /api/registry/asset 同源加载；Giscus 评论
  "script-src 'self' 'unsafe-inline' https://giscus.app",
  // 插件内联 <style> 需要 unsafe-inline；Google Fonts CSS
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // 图片允许所有 HTTPS（文章封面、CDN 图床）
  "img-src 'self' data: blob: https:",
  // Google Fonts 字体文件 + base64 内嵌字体
  "font-src 'self' data: https://fonts.gstatic.com",
  // Giscus 评论 API；GitHub API（storage fallback）
  "connect-src 'self' https://giscus.app https://api.github.com",
  // Giscus iframe
  "frame-src https://giscus.app",
  "frame-ancestors 'none'",
].join("; ");

const ADMIN_CSP = [
  "default-src 'self'",
  // Admin 页面有内联脚本（React 注入）
  "script-src 'self' 'unsafe-inline'",
  // Admin 可能预览插件 CSS，允许 Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // 允许 HTTPS 图片（插件图标、预览）
  "img-src 'self' data: blob: https:",
  // Google Fonts 字体文件
  "font-src 'self' data: https://fonts.gstatic.com",
  // Admin 需要访问 GitHub API（registry 加载）
  "connect-src 'self' https://api.github.com",
  "frame-ancestors 'none'",
].join("; ");

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // 安全响应头（通用）
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

  // 按路由分级 CSP
  response.headers.set(
    "Content-Security-Policy",
    pathname.startsWith("/admin") ? ADMIN_CSP : BLOG_CSP
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
  ],
};
