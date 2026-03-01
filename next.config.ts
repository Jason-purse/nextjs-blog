import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  async rewrites() {
    const rewrites: Array<{ source: string; destination: string }> = []
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      const settingsPath = path.join(process.cwd(), 'content', 'settings.json')
      const settingsRaw = await fs.readFile(settingsPath, 'utf-8')
      const settings = JSON.parse(settingsRaw)
      const registry = settings?.plugins?.registry || {}

      for (const [id, info] of Object.entries(registry as Record<string, { enabled?: boolean }>)) {
        if (!info?.enabled) continue
        const pluginJsonPath = path.join(process.cwd(), 'content', 'installed-plugins', id, 'plugin.json')
        try {
          const pluginJson = JSON.parse(await fs.readFile(pluginJsonPath, 'utf-8'))
          const pageRoute = pluginJson?.formats?.page?.route
          if (pageRoute && pageRoute !== `/p/${id}`) {
            rewrites.push({ source: pageRoute, destination: `/p/${id}` })
          }
        } catch { /* plugin not installed or no page format */ }
      }
    } catch { /* settings.json doesn't exist yet */ }
    return rewrites
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
