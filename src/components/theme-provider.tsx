"use client"
// src/components/theme-provider.tsx
// ThemePlugin 的 React 适配层
// 职责：从 plugin ctx 读主题列表，管理 localStorage + data-theme 属性

import React, { createContext, useContext, useEffect, useState } from 'react'
import { THEMES, DEFAULT_THEME } from '../../blog.config'
import type { ThemePreset } from '@/plugins/theme'

const STORAGE_KEY = 'blog-theme'

interface ThemeContextType {
  theme: string
  setTheme: (id: string) => void
  themes: ThemePreset[]
  current: ThemePreset | undefined
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<string>(DEFAULT_THEME)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const valid = THEMES.find(t => t.id === saved)
    const active = valid ? saved! : DEFAULT_THEME
    setThemeState(active)
    document.documentElement.setAttribute('data-theme', active)
    setMounted(true)
  }, [])

  const setTheme = (id: string) => {
    const valid = THEMES.find(t => t.id === id)
    if (!valid) return
    setThemeState(id)
    localStorage.setItem(STORAGE_KEY, id)
    document.documentElement.setAttribute('data-theme', id)
  }

  if (!mounted) {
    // 防止 hydration mismatch，渲染空壳
    return <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES, current: undefined }}>
      {children}
    </ThemeContext.Provider>
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      themes: THEMES,
      current: THEMES.find(t => t.id === theme),
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
