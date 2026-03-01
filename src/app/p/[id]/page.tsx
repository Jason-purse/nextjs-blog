// 公共插件页面：/p/{id} 加载插件的 page WC
// 同时支持 next.config.ts rewrites 将 /guestbook 映射到 /p/guestbook
import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { storage } from '@/lib/storage'
import { PluginPublicPage } from './plugin-public-page'

async function getPluginPageManifest(id: string) {
  const settingsRaw = await storage.read('settings.json')
  if (!settingsRaw) return null
  const settings = JSON.parse(settingsRaw)
  const registry = settings?.plugins?.registry
  if (!registry?.[id]?.enabled) return null

  const cached = await storage.read(`installed-plugins/${id}/plugin.json`)
  if (cached) {
    const m = JSON.parse(cached)
    if (m?.formats?.page) return m
    return null
  }
  return null
}

export default async function PluginPageRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const manifest = await getPluginPageManifest(id)
  if (!manifest) notFound()

  const pageFormat = manifest.formats.page
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <PluginPublicPage
          id={id}
          title={pageFormat.title || manifest.name}
          source={`plugins/${manifest.category}/${id}`}
          entry={manifest.formats.webcomponent?.entry || ''}
          element={manifest.formats.webcomponent?.element || `blog-${id}`}
          version={manifest.version || '1.0.0'}
        />
      </main>
    </div>
  )
}
