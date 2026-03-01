// src/lib/themes.ts

export type ThemeMode = 'editorial' | 'minimal' | 'tech' | 'warm';

export interface Theme {
  value: ThemeMode;
  label: string;
  icon: string; // Using emoji for simplicity, can be ReactNode
}

export const themes: Theme[] = [
  { value: 'editorial', label: 'Editorial', icon: '✒️' },
  { value: 'minimal', label: 'Minimal', icon: '⚪' },
  { value: 'tech', label: 'Tech', icon: '💻' },
  { value: 'warm', label: 'Warm', icon: '☕' },
];

export const defaultTheme: ThemeMode = 'editorial';