// src/components/plugin-loader.tsx
// 服务端组件：加载已安装插件的 CSS，注入到 <head>
// Phase 1：CSS 插件先跑通，WC/JS 插件后续接入

// 已安装插件列表（Phase 1 先硬编码，Phase 2 接 settings.json）
const INSTALLED_CSS_PLUGINS = [
  {
    id: 'reading-progress',
    cssPath: 'plugins/reading-progress/css/index.css',
  },
]

async function fetchPluginCSS(path: string): Promise<string | null> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3001'

    const res = await fetch(
      `${baseUrl}/api/registry/asset?path=${encodeURIComponent(path)}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

export async function PluginLoader() {
  const styles = await Promise.all(
    INSTALLED_CSS_PLUGINS.map(async (p) => {
      const css = await fetchPluginCSS(p.cssPath)
      return css ? { id: p.id, css } : null
    })
  )

  const validStyles = styles.filter(Boolean) as { id: string; css: string }[]
  if (validStyles.length === 0) return null

  return (
    <>
      {validStyles.map(({ id, css }) => (
        <style key={id} data-plugin={id} dangerouslySetInnerHTML={{ __html: css }} />
      ))}
    </>
  )
}
