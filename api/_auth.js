// Accounts, sessions and Pro entitlement.
import { createHash, createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { readJSON, writeJSON } from './_store.js'
import { HttpError } from './_card.js'

const scrypt = promisify(_scrypt)
const COOKIE = 'dbz_session'
const SESSION_DAYS = 30
const isLocal = () => !!process.env.LOCAL_STORE_DIR

function secret() {
  const s = process.env.SESSION_SECRET
  if (s) return s
  if (isLocal()) return 'local-dev-secret'
  throw new Error('SESSION_SECRET is not configured')
}

export const normEmail = (e) => String(e || '').trim().toLowerCase()
const emailKey = (email) => `emails/${createHash('sha256').update(normEmail(email)).digest('hex')}.json`
const userKey = (id) => `users/${id}.json`

export async function hashPassword(pw) {
  const salt = randomBytes(16)
  const hash = await scrypt(pw, salt, 64)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}
export async function checkPassword(pw, stored) {
  const [, s, h] = String(stored || '').split('$')
  if (!s || !h) return false
  const want = Buffer.from(h, 'base64')
  const got = await scrypt(String(pw), Buffer.from(s, 'base64'), want.length)
  return timingSafeEqual(want, got)
}

export async function findUserByEmail(email) {
  const idx = await readJSON(emailKey(email))
  return idx ? readJSON(userKey(idx.userId)) : null
}
export const getUser = (id) => (/^[A-Za-z0-9_-]{6,32}$/.test(id || '') ? readJSON(userKey(id)) : null)
export const saveUser = (user) => writeJSON(userKey(user.id), { ...user, updatedAt: new Date().toISOString() })

export async function createUser(email, password, name) {
  const id = randomBytes(9).toString('base64url')
  const now = new Date().toISOString()
  try {
    // Create-only write: fails if the address is already registered.
    await writeJSON(emailKey(email), { userId: id }, { create: true })
  } catch {
    throw new HttpError(409, 'An account with this email already exists. Sign in instead.')
  }
  const user = {
    id,
    email: normEmail(email),
    name: String(name || '').trim().slice(0, 60),
    passwordHash: await hashPassword(password),
    createdAt: now,
    cardId: null,
    billing: null,
  }
  await saveUser(user)
  return user
}

// ---- Sessions (HMAC-signed cookie) ----
const sign = (payload) => createHmac('sha256', secret()).update(payload).digest('base64url')
const cookieAttrs = (maxAge) => `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isLocal() ? '' : '; Secure'}`

export function sessionCookie(userId) {
  const exp = Date.now() + SESSION_DAYS * 864e5
  const payload = `${userId}.${exp}`
  return `${COOKIE}=${payload}.${sign(payload)}; ${cookieAttrs(SESSION_DAYS * 86400)}`
}
export const clearCookie = () => `${COOKIE}=; ${cookieAttrs(0)}`

function readCookie(req) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim()
  }
  return ''
}

export async function currentUser(req) {
  const [id, exp, sig] = readCookie(req).split('.')
  if (!id || !exp || !sig) return null
  const want = Buffer.from(sign(`${id}.${exp}`))
  const got = Buffer.from(sig)
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null
  if (Number(exp) < Date.now()) return null
  return getUser(id)
}

export async function requireUser(req) {
  const u = await currentUser(req)
  if (!u) throw new HttpError(401, 'Please sign in first')
  return u
}

// ---- Entitlement ----
const proEmails = () => (process.env.PRO_EMAILS || '').split(',').map(normEmail).filter(Boolean)

export function isPro(user) {
  if (!user) return false
  if (proEmails().includes(user.email)) return true
  const b = user.billing
  // Small grace period so a renewal that is still processing doesn't lock anyone out.
  return !!b && ['active', 'trialing'].includes(b.status) && (!b.periodEnd || b.periodEnd * 1000 > Date.now() - 3 * 864e5)
}

export function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    cardId: user.cardId || null,
    pro: isPro(user),
    complimentary: proEmails().includes(user.email),
    billing: user.billing
      ? { status: user.billing.status, periodEnd: user.billing.periodEnd, cancelAtPeriodEnd: !!user.billing.cancelAtPeriodEnd, hasAccount: !!user.billing.customerId }
      : null,
  }
}
