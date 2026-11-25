import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const STR = { name: 60, title: 60, company: 60, bio: 160, phone: 40, email: 100, website: 120, location: 80 }
const SOCIALS = ['linkedin', 'x', 'instagram', 'facebook', 'tiktok', 'youtube', 'github', 'whatsapp']
const THEMES = ['glass', 'lime', 'midnight', 'peach', 'mono']
const AVATAR_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
const AVATAR_MAX = 120_000

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function cleanCard(input, { requireName = true } = {}) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Card data is missing')
  const out = { socials: {} }
  for (const [k, max] of Object.entries(STR)) {
    const v = input[k]
    out[k] = typeof v === 'string' ? v.trim().slice(0, max) : ''
  }
  if (requireName && !out.name) throw new HttpError(400, 'Add your name before publishing')
  out.theme = THEMES.includes(input.theme) ? input.theme : 'glass'
  const av = typeof input.avatar === 'string' ? input.avatar : ''
  if (av && (!AVATAR_RE.test(av) || av.length > AVATAR_MAX)) throw new HttpError(400, 'Photo must be a JPEG, PNG or WebP under 90 KB')
  out.avatar = av
  const s = input.socials && typeof input.socials === 'object' ? input.socials : {}
  for (const k of SOCIALS) if (typeof s[k] === 'string' && s[k].trim()) out.socials[k] = s[k].trim().slice(0, 120)
  return out
}

const ALPHA = 'abcdefghijkmnpqrstuvwxyz23456789'
export function newId(len = 8) {
  const b = randomBytes(len)
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHA[b[i] % ALPHA.length]
  return s
}
export const newToken = () => randomBytes(24).toString('base64url')
export const hashToken = (t) => createHash('sha256').update(String(t)).digest('hex')
export function tokenMatches(token, hash) {
  if (!token || !hash) return false
  const a = Buffer.from(hashToken(token), 'hex')
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export const ID_RE = /^[a-z0-9]{6,16}$/

export async function readBody(req, max = 200_000) {
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
  let raw = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : ''
  if (!raw) {
    const chunks = []
    let size = 0
    for await (const c of req) {
      size += c.length
      if (size > max) throw new HttpError(413, 'That’s too large to save')
      chunks.push(c)
    }
    raw = Buffer.concat(chunks).toString('utf8')
  }
  if (raw.length > max) throw new HttpError(413, 'That’s too large to save')
  try {
    return JSON.parse(raw || '{}')
  } catch {
    throw new HttpError(400, 'Invalid JSON')
  }
}

export function send(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

export function handleError(res, e) {
  if (e instanceof HttpError) return send(res, e.status, { error: e.message })
  console.error(e)
  send(res, 500, { error: 'Something went wrong. Please try again.' })
}
