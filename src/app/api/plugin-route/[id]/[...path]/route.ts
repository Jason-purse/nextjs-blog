// 插件通用数据 CRUD
// GET  /api/plugin-route/{id}/data           → 读取全部数据（JSON 数组）
// POST /api/plugin-route/{id}/data           → 追加一条记录
// PUT  /api/plugin-route/{id}/data/{idx}     → 更新指定索引记录
// DELETE /api/plugin-route/{id}/data/{idx}   → 删除指定索引记录
// GET  /api/plugin-route/{id}/kv/{key}       → 读 KV
// PUT  /api/plugin-route/{id}/kv/{key}       → 写 KV

import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

// 简单鉴权：带 admin cookie 才能写操作
async function isAdmin(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get('admin_token')?.value
  return cookie === process.env.ADMIN_SECRET || cookie === 'authenticated'
}

function dataPath(id: string, key = 'data'): string {
  return `plugin-data/${id}/${key}.json`
}

async function readJSON(path: string): Promise<unknown[]> {
  const raw = await storage.read(path)
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

async function readKV(path: string): Promise<Record<string, unknown>> {
  const raw = await storage.read(path)
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id, path: pathParts } = await params
  const [resource, ...rest] = pathParts ?? ['data']

  if (resource === 'kv') {
    const key = rest[0] || 'default'
    const kv = await readKV(dataPath(id, `kv-${key}`))
    return NextResponse.json(kv)
  }

  // resource === 'data' (list)
  const items = await readJSON(dataPath(id))
  return NextResponse.json(items)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id } = await params
  if (!await isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const items = await readJSON(dataPath(id))
  const newItem = { ...body, _id: Date.now(), _createdAt: new Date().toISOString() }
  items.push(newItem)
  await storage.write(dataPath(id), JSON.stringify(items, null, 2))
  return NextResponse.json({ success: true, item: newItem })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id, path: pathParts } = await params
  if (!await isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [resource, key] = pathParts ?? []
  if (resource === 'kv') {
    const body = await req.json()
    await storage.write(dataPath(id, `kv-${key || 'default'}`), JSON.stringify(body, null, 2))
    return NextResponse.json({ success: true })
  }

  // update by index
  const idx = parseInt(key || '0', 10)
  const body = await req.json()
  const items = await readJSON(dataPath(id)) as Record<string, unknown>[]
  if (idx < 0 || idx >= items.length) return NextResponse.json({ error: 'out of range' }, { status: 400 })
  items[idx] = { ...items[idx], ...body, _updatedAt: new Date().toISOString() }
  await storage.write(dataPath(id), JSON.stringify(items, null, 2))
  return NextResponse.json({ success: true, item: items[idx] })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id, path: pathParts } = await params
  if (!await isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [, key] = pathParts ?? []
  const idx = parseInt(key || '0', 10)
  const items = await readJSON(dataPath(id)) as unknown[]
  if (idx < 0 || idx >= items.length) return NextResponse.json({ error: 'out of range' }, { status: 400 })
  items.splice(idx, 1)
  await storage.write(dataPath(id), JSON.stringify(items, null, 2))
  return NextResponse.json({ success: true })
}
