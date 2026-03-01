import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { PluginLoader } from "@/components/plugin-loader";
import { PluginRuntime } from "@/components/plugin-runtime";
import { storage } from "@/lib/storage";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: "variable",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Blog",
    template: "%s | AI Blog",
  },
  description: "A minimalist blog inspired by Japanese Zen aesthetics - editorial design meets mindful writing",
  keywords: ["blog", "tech", "coding", "lifestyle", "minimalist", "design"],
  authors: [{ name: "AI Blogger" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "AI Blog",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// 获取已启用插件的配置，注入到 window.__BLOG_PLUGIN_CONFIG__
async function getPluginConfigs(): Promise<Record<string, Record<string, unknown>>> {
  try {
    const raw = await storage.read('settings.json')
    if (!raw) return {}
    const settings = JSON.parse(raw)
    const registry = settings?.plugins?.registry
    if (!registry) return {}
    
    const configs: Record<string, Record<string, unknown>> = {}
    for (const [pluginId, pluginData] of Object.entries(registry as Record<string, { enabled: boolean; config?: Record<string, unknown> }>)) {
      if (pluginData.enabled && pluginData.config) {
        configs[pluginId] = pluginData.config
      }
    }
    return configs
  } catch {
    return {}
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pluginConfigs = await getPluginConfigs()
  const pluginConfigScript = (
    <script 
      dangerouslySetInnerHTML={{ 
        __html: `window.__BLOG_PLUGIN_CONFIG__ = ${JSON.stringify(pluginConfigs)}` 
      }} 
    />
  )

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <PluginLoader />
      </head>
      <body
        className={`${playfair.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider>
          {/* JS 插件客户端 Runtime */}
          <PluginRuntime />
          {/* Slot 容器：JS 插件挂载到这里 */}
          <div data-blog-slot="before-content" />
          {children}
          <div data-blog-slot="after-content" />
        </ThemeProvider>
        {/* 插件配置注入 */}
        {pluginConfigScript}
      </body>
    </html>
  );
}
