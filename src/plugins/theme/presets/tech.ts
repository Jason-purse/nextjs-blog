// src/plugins/theme/presets/tech.ts
import type { ThemePreset } from '../types'

export const tech: ThemePreset = {
  id: 'tech',
  label: 'Tech',
  icon: '💻',
  description: '极客终端风',
  vars: {
    '--background': '#0D1117',
    '--foreground': '#E6EDF3',
    '--muted': '#30363D',
    '--muted-foreground': '#8B949E',
    '--border': '#21262D',
    '--card': '#161B22',
    '--card-foreground': '#E6EDF3',
    '--primary': '#58A6FF',
    '--primary-foreground': '#0D1117',
    '--secondary': '#21262D',
    '--secondary-foreground': '#E6EDF3',
    '--accent': '#3FB950',
    '--accent-foreground': '#0D1117',
    '--radius': '4px',
  },
  fonts: [
    { family: 'JetBrains Mono, Fira Code, Courier New', var: '--font-heading', weights: ['400','700'] },
    { family: 'JetBrains Mono, Fira Code, Courier New', var: '--font-body',    weights: ['400'] },
    { family: 'JetBrains Mono',                         var: '--font-mono',    weights: ['400'] },
  ],
}
