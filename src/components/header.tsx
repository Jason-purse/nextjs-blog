"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useState, useRef } from "react";

export function Header() {
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, themes, current: currentTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [pageLinks, setPageLinks] = useState<Array<{href: string; label: string}>>([])

  useEffect(() => {
    fetch('/api/plugins/runtime')
      .then(r => r.json())
      .then((plugins: any) => {
        const pages = plugins
          .filter((p: any) => p.formats?.page?.nav)
          .map((p: any) => ({
            href: p.formats.page.nav.location === 'header' ? p.formats.page.route : '',
            label: p.formats.page.nav.label || p.name
          }))
          .filter((p: any) => p.href)
        setPageLinks(pages)
      })
      .catch(() => {})
  }, [])

  const navLinks = [
    { href: "/blog",       label: "Blog" },
    { href: "/archives",   label: "Archives" },
    { href: "/categories", label: "Categories" },
    { href: "/search",    label: "Search" },
    { href: "/about",     label: "About" },
    ...pageLinks
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-heading text-xl font-semibold tracking-tight text-[var(--foreground)]">
          AI Blog
        </Link>

        <nav className="flex items-center gap-6">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href}
              className="text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
              {label}
            </Link>
          ))}

          {/* 主题切换下拉 */}
          {mounted && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-1.5 text-sm text-[var(--foreground)] transition-all hover:border-[var(--accent)]"
                aria-label="切换主题"
              >
                <span className="text-base">{currentTheme?.icon ?? "🎨"}</span>
                <span className="hidden sm:inline text-xs font-medium">
                  {currentTheme?.label ?? "Theme"}
                </span>
                <svg className={`h-3 w-3 text-[var(--muted-foreground)] transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-lg">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    主题风格
                  </p>
                  {themes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id); setDropdownOpen(false); }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                        theme === t.id
                          ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-medium"
                          : "text-[var(--foreground)] hover:bg-[var(--secondary)]"
                      }`}
                    >
                      <span className="text-base">{t.icon}</span>
                      <div className="text-left">
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs opacity-70">{t.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
