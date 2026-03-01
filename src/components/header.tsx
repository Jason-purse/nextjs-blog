"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { themes, type ThemeMode } from "@/lib/themes";
import { useEffect, useState, useRef } from "react";

const THEME_ICONS: Record<ThemeMode, string> = {
  editorial: "✒️",
  minimal: "◻️",
  tech: "💻",
  warm: "☕",
};

export function Header() {
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentTheme = themes.find((t) => t.value === theme);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-heading text-xl font-semibold tracking-tight text-[var(--foreground)]"
        >
          AI Blog
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/blog" className="text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
            Blog
          </Link>
          <Link href="/archives" className="text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
            Archives
          </Link>
          <Link href="/about" className="text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
            About
          </Link>
          <Link href="/categories" className="text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
            Categories
          </Link>
          <Link href="/search" className="text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
            Search
          </Link>

          {/* 主题切换下拉 */}
          {mounted && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-1.5 text-sm text-[var(--foreground)] transition-all hover:border-[var(--accent)] hover:bg-[var(--secondary)]"
                aria-label="切换主题"
                title="切换主题"
              >
                <span className="text-base">{THEME_ICONS[theme]}</span>
                <span className="hidden sm:inline text-xs font-medium">
                  {currentTheme?.label ?? "Theme"}
                </span>
                <svg
                  className={`h-3 w-3 text-[var(--muted-foreground)] transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-lg">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    主题风格
                  </p>
                  {themes.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => {
                        setTheme(t.value);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                        theme === t.value
                          ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-medium"
                          : "text-[var(--foreground)] hover:bg-[var(--secondary)]"
                      }`}
                    >
                      <span className="text-base">{t.icon}</span>
                      <div className="text-left">
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs opacity-70">{THEME_DESCRIPTIONS[t.value]}</div>
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

const THEME_DESCRIPTIONS: Record<ThemeMode, string> = {
  editorial: "文艺出版风",
  minimal: "极简苹果风",
  tech: "极客终端风",
  warm: "温馨咖啡馆",
};
