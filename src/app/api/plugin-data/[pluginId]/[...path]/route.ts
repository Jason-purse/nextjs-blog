// ============================================================
// Plugin Data API - 插件私有数据接口
// GET/POST/PUT/DELETE /api/plugin-data/{pluginId}/{path}
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

const DATA_DIR = 'plugin-data'

// 简单鉴权
async function isAdmin(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get('admin_token')?.value
  return cookie === process.env.ADMIN_SECRET || cookie === 'authenticated'
}

function dataPath(pluginId: string, path: string): string {
  return `${DATA_DIR}/${pluginId}/${path}.json`
}

async function readJSON(path: string): Promise<any> {
  const raw = await storage.read(path)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

async function writeJSON(path: string, data: any): Promise<void> {
  await storage.write(path, JSON.stringify(data, null, 2))
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> }
) {
  const { pluginId, path } = await params
  const key = path.join('/')
  const data = await readJSON(dataPath(pluginId, key))
  return NextResponse.json({ data })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> }
) {
  const { pluginId, path } = await params
  const key = path.join('/')
  
  // POST 公开（留言等），PUT/DELETE 需要 admin
  const body = await req.json()
  const existing = await readJSON(dataPath(pluginId, key)) as any[]
  
  const arr = Array.isArray(existing) ? existing : []
  const newItem = { ...body, _id: Date.now(), _createdAt: new Date().toISOString() }
  arr.push(newItem)
  
  await writeJSON(dataPath(pluginId, key), arr)
  return NextResponse.json({ success: true, item: newItem })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> }
) {
  const { pluginId, path } = await params
  if (!await isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const key = path[0]  // PUT /pluginId/key
  const body = await req.json()
  await writeJSON(dataPath(pluginId, key), body)
  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> }
) {
  const { pluginId, path } = await params
  if (!await isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const key = path[0]  // DELETE /pluginId/key
  await storage.delete(dataPath(pluginId, key))
  return NextResponse.json({ success: true })
}
