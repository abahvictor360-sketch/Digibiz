// Storage for cards, accounts and wallets. Uses a private Vercel Blob store in
// production and a local folder when LOCAL_STORE_DIR is set (dev server, tests).
import { promises as fs } from 'node:fs'
import path from 'node:path'

const local = () => process.env.LOCAL_STORE_DIR
const localPath = (key) => {
  const root = path.resolve(local())
  const p = path.resolve(root, key)
  if (!p.startsWith(root + path.sep)) throw new Error('Bad storage key')
  return p
}

async function readRaw(key) {
  if (local()) {
    try {
      return await fs.readFile(localPath(key))
    } catch (e) {
      if (e.code === 'ENOENT') return null
      throw e
    }
  }
  const { get } = await import('@vercel/blob')
  const res = await get(key, { access: 'private', useCache: false })
  if (!res || res.statusCode !== 200) return null
  return Buffer.from(await new Response(res.stream).arrayBuffer())
}

async function writeRaw(key, body, contentType, { create = false } = {}) {
  if (local()) {
    const file = localPath(key)
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, body, create ? { flag: 'wx' } : undefined)
    return
  }
  const { put } = await import('@vercel/blob')
  await put(key, body, { access: 'private', addRandomSuffix: false, allowOverwrite: !create, contentType, cacheControlMaxAge: 60 })
}

export async function readJSON(key) {
  const buf = await readRaw(key)
  return buf ? JSON.parse(buf.toString('utf8')) : null
}
export const writeJSON = (key, data, opts) => writeRaw(key, JSON.stringify(data), 'application/json', opts)
export const readBinary = readRaw
export const writeBinary = (key, buf, type) => writeRaw(key, buf, type)

export async function removeKey(key) {
  if (local()) {
    await fs.unlink(localPath(key)).catch(() => {})
    return
  }
  const { del, head } = await import('@vercel/blob')
  try {
    const h = await head(key)
    await del(h.url)
  } catch {
    /* already gone */
  }
}

// Helpers used by the cards API.
export const readRecord = (id) => readJSON(`cards/${id}.json`)
export const writeRecord = (id, rec, opts) => writeJSON(`cards/${id}.json`, rec, opts)
