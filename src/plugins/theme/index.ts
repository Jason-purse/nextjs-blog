// src/plugins/theme/index.ts
// ThemePlugin：Plugin #0，整个博客的视觉地基
// 职责：注册主题预设到 ctx，transform 时注入 themeVars 到 artifacts

import type { BlogPlugin, BlogContext, BlogInput } from '@/core/plugin'
import type { ThemePreset, ThemePluginConfig } from './types'

export type { ThemePreset, ThemePluginConfig } from './types'
export { editorial } from './presets/editorial'
export { minimal }   from './presets/minimal'
export { tech }      from './presets/tech'
export { warm }      from './presets/warm'

export const THEME_CTX_KEY = 'theme:presets'
export const THEME_DEFAULT_KEY = 'theme:default'

export function themePlugin(config: ThemePluginConfig): BlogPlugin {
  const storageKey = config.storageKey ?? 'blog-theme'

  return {
    name: 'theme',

    setup(ctx: BlogContext) {
      // 注册主题列表到 ctx，其他 plugin 可读取
      ctx.set(THEME_CTX_KEY, config.themes)
      ctx.set(THEME_DEFAULT_KEY, config.default)
      ctx.set('theme:storageKey', storageKey)

      // 生成 CSS 字符串，注入到 ctx 供 layout 使用
      const cssChunks = config.themes.map(t => buildThemeCSS(t))
      ctx.set('theme:css', cssChunks.join('\n\n'))
    },

    transform(input: BlogInput, ctx: BlogContext) {
      // 把主题元信息注入到文章 artifacts
      const themes = ctx.get<ThemePreset[]>(THEME_CTX_KEY) ?? []
      input.artifacts['theme:presets'] = themes
      input.artifacts['theme:default'] = ctx.get(THEME_DEFAULT_KEY)
      input.artifacts['theme:storageKey'] = ctx.get('theme:storageKey')
      return input
    },
  }
}

// ── CSS 生成 ───────────────────────────────────────────────────
function buildThemeCSS(theme: ThemePreset): string {
  const selector = theme.id === 'editorial'
    ? `:root, [data-theme="editorial"]`
    : `[data-theme="${theme.id}"]`

  const vars = Object.entries(theme.vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')

  const fontVars = (theme.fonts ?? [])
    .map(f => `  ${f.var}: ${f.family};`)
    .join('\n')

  let css = `${selector} {\n${vars}\n${fontVars}\n}`

  if (theme.bodyOverrides) {
    const overrides = Object.entries(theme.bodyOverrides)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n')
    css += `\n\n[data-theme="${theme.id}"] body {\n${overrides}\n}`
  }

  return css
}
