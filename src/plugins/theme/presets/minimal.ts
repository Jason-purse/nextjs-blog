// src/plugins/theme/presets/minimal.ts
import type { ThemePreset } from '../types'

export const minimal: ThemePreset = {
  id: 'minimal',
  label: 'Minimal',
  icon: '◻️',
  description: '极简苹果风',
  vars: {
    '--background': '#FFFFFF',
    '--foreground': '#111111',
    '--muted': '#888888',
    '--muted-foreground': '#666666',
    '--border': '#E8E8E8',
    '--card': '#FAFAFA',
    '--card-foreground': '#111111',
    '--primary': '#111111',
    '--primary-foreground': '#FFFFFF',
    '--secondary': '#F5F5F5',
    '--secondary-foreground': '#111111',
    '--accent': '#0066FF',
    '--accent-foreground': '#FFFFFF',
    '--radius': '12px',
  },
  fonts: [
    { family: '-apple-system, SF Pro Display, Helvetica Neue', var: '--font-heading', weights: ['700'] },
    { family: '-apple-system, SF Pro Text, Helvetica Neue',    var: '--font-body',    weights: ['400'] },
    { family: 'SF Mono, Fira Code',                            var: '--font-mono',    weights: ['400'] },
  ],
  bodyOverrides: {
    'letter-spacing': '-0.01em',
    'line-height': '1.65',
  },
}
