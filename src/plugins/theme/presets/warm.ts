// src/plugins/theme/presets/warm.ts
import type { ThemePreset } from '../types'

export const warm: ThemePreset = {
  id: 'warm',
  label: 'Warm',
  icon: '☕',
  description: '温馨咖啡馆',
  vars: {
    '--background': '#FDF6EC',
    '--foreground': '#3D2B1F',
    '--muted': '#C49A6C',
    '--muted-foreground': '#8B6347',
    '--border': '#E8D5B7',
    '--card': '#FFFAF3',
    '--card-foreground': '#3D2B1F',
    '--primary': '#8B4513',
    '--primary-foreground': '#FDF6EC',
    '--secondary': '#F5E6CE',
    '--secondary-foreground': '#3D2B1F',
    '--accent': '#D4872B',
    '--accent-foreground': '#FFFFFF',
    '--radius': '16px',
  },
  fonts: [
    { family: 'Playfair Display, Georgia', var: '--font-heading', weights: ['400','600','700'], styles: ['normal','italic'] },
    { family: 'Lora, Georgia',             var: '--font-body',    weights: ['400','500'] },
    { family: 'JetBrains Mono',            var: '--font-mono',    weights: ['400'] },
  ],
  bodyOverrides: {
    'line-height': '1.85',
  },
}
