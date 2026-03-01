// src/plugins/theme/presets/editorial.ts
import type { ThemePreset } from '../types'

export const editorial: ThemePreset = {
  id: 'editorial',
  label: 'Editorial',
  icon: '✒️',
  description: '文艺出版风',
  vars: {
    '--background': '#F7F4EF',
    '--foreground': '#1A1A18',
    '--muted': '#7C8C6E',
    '--muted-foreground': '#5a6351',
    '--border': '#D8D4CC',
    '--card': '#FFFFFF',
    '--card-foreground': '#1A1A18',
    '--primary': '#1A1A18',
    '--primary-foreground': '#F7F4EF',
    '--secondary': '#EDE8E0',
    '--secondary-foreground': '#1A1A18',
    '--accent': '#7C8C6E',
    '--accent-foreground': '#FFFFFF',
    '--radius': '6px',
  },
  fonts: [
    { family: 'Playfair Display', var: '--font-heading', weights: ['400','600','700'], styles: ['normal','italic'] },
    { family: 'Source Serif 4',   var: '--font-body',    weights: ['300','400','600'] },
    { family: 'JetBrains Mono',   var: '--font-mono',    weights: ['400','500'] },
  ],
}
