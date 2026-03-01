// src/plugins/reading-time/index.ts
import readingTime from 'reading-time'
import type { BlogPlugin, BlogInput } from '@/core/plugin'

export function readingTimePlugin(): BlogPlugin {
  return {
    name: 'reading-time',
    transform(input: BlogInput) {
      if (input.raw) {
        const stats = readingTime(input.raw)
        input.meta.readingTime = stats.text
        input.meta.readingTimeMinutes = Math.ceil(stats.minutes)
      }
      return input
    },
  }
}
