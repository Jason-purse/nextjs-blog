// src/components/theme-switcher.tsx
"use client";

import { useTheme } from './theme-provider';
import { themes, ThemeMode } from '@/lib/themes';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-2 p-4 border border-[var(--border)] rounded-lg bg-[var(--card)] shadow-sm w-full max-w-xs">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2 uppercase tracking-wider">
        Select Theme
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {themes.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value as ThemeMode)}
            className={`
              flex flex-col items-center justify-center p-3 rounded-md border transition-all duration-200
              ${
                theme === t.value
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                  : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--secondary)] text-[var(--foreground)]'
              }
            `}
          >
            <span className="text-xl mb-1">{t.icon}</span>
            <span className="text-xs font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}