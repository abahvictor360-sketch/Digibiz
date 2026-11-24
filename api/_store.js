// Card storage. Uses Vercel Blob (private) in production; a local folder when
// LOCAL_STORE_DIR is set (dev server and tests).
import { promises as fs } from 'node:fs'
import path from 'node:path'

const local = () => process.env.LOCAL_STORE_DIR

export async function readRecord(id) {
  if (local()) {
    try {
      return JSON.parse(await fs.readFile(path.join(local(), `${id}.json`), 'utf8'))
    } catch (e) {
      if (e.code === 'ENOENT') return null
      throw e
    }
  }
  const { get } = await import('@vercel/blob')
  const res = await get(`cards/${id}.json`, { access: 'private', useCache: false })
  if (!res || res.statusCode !== 200) return null
  return await new Response(res.stream).json()
}

export async function writeRecord(id, record, { create = false } = {}) {
  const body = JSON.stringify(record)
  if (local()) {
    await fs.mkdir(local(), { recursive: true })
    const file = path.join(local(), `${id}.json`)
    await fs.writeFile(file, body, create ? { flag: 'wx' } : undefined)
    return
  }
  const { put } = await import('@vercel/blob')
  await put(`cards/${id}.json`, body, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: !create,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  })
}
