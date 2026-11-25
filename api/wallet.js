// The signed-in user's saved business cards. Free for everyone.
// GET    /api/wallet                       -> { items }
// GET    /api/wallet?photo=<itemId>        -> JPEG photo of a paper card
// POST   /api/wallet { cardId }            -> save a digibiz card (kept in sync with its owner's edits)
// POST   /api/wallet { card, photo?, notes?, tags? } -> save a card typed in by hand
// PATCH  /api/wallet { id, notes?, tags?, favorite?, card? }
// DELETE /api/wallet?id=<itemId>
import { randomBytes } from 'node:crypto'
import { requireUser } from './_auth.js'
import { HttpError, ID_RE, cleanCard, handleError, readBody, send } from './_card.js'
import { readBinary, readJSON, readRecord, removeKey, writeBinary, writeJSON } from './_store.js'

const MAX_ITEMS = 2000
const PHOTO_RE = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/
const PHOTO_MAX = 600_000 // characters of base64, ~450 KB image
const ITEM_ID_RE = /^[A-Za-z0-9_-]{8,24}$/

const walletKey = (uid) => `wallets/${uid}.json`
const photoKey = (uid, id) => `photos/${uid}/${id}.jpg`

async function loadWallet(uid) {
  return (await readJSON(walletKey(uid))) || { items: [] }
}
const saveWallet = (uid, wallet) => writeJSON(walletKey(uid), wallet)

function cleanTags(tags) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map((t) => String(t).trim().slice(0, 24)).filter(Boolean))].slice(0, 10)
}
const cleanNotes = (n) => (typeof n === 'string' ? n.slice(0, 1000) : '')

function manualCard(input) {
  const card = cleanCard(input, { requireName: false })
  if (!card.name && !card.company) throw new HttpError(400, 'Add at least a name or a company')
  return card
}

// Fill in the latest version of each saved digibiz card.
async function withLatest(items) {
  return Promise.all(
    items.map(async (it) => {
      if (!it.cardId) return it
      const rec = await readRecord(it.cardId).catch(() => null)
      if (!rec) return { ...it, removed: true }
      return { ...it, card: rec.card, removed: false }
    })
  )
}

export default async function handler(req, res) {
  try {
    const user = await requireUser(req)
    const url = new URL(req.url, 'http://x')

    if (req.method === 'GET') {
      const photo = url.searchParams.get('photo')
      if (photo) {
        if (!ITEM_ID_RE.test(photo)) throw new HttpError(404, 'Not found')
        const buf = await readBinary(photoKey(user.id, photo))
        if (!buf) throw new HttpError(404, 'Not found')
        res.statusCode = 200
        res.setHeader('Content-Type', 'image/jpeg')
        res.setHeader('Cache-Control', 'private, max-age=3600')
        return res.end(buf)
      }
      const wallet = await loadWallet(user.id)
      return send(res, 200, { items: await withLatest(wallet.items) })
    }

    if (req.method === 'POST') {
      const body = await readBody(req, 800_000)
      const wallet = await loadWallet(user.id)
      if (wallet.items.length >= MAX_ITEMS) throw new HttpError(400, 'Your wallet is full')
      const now = new Date().toISOString()
      const item = { id: randomBytes(9).toString('base64url'), notes: cleanNotes(body.notes), tags: cleanTags(body.tags), favorite: false, hasPhoto: false, createdAt: now, updatedAt: now }

      if (body.cardId) {
        const cardId = String(body.cardId)
        if (!ID_RE.test(cardId)) throw new HttpError(404, 'Card not found')
        if (cardId === user.cardId) throw new HttpError(400, 'That’s your own card')
        const existing = wallet.items.find((it) => it.cardId === cardId)
        if (existing) return send(res, 200, { item: (await withLatest([existing]))[0], duplicate: true })
        const rec = await readRecord(cardId)
        if (!rec) throw new HttpError(404, 'Card not found')
        Object.assign(item, { source: 'digibiz', cardId, card: rec.card })
      } else {
        Object.assign(item, { source: 'manual', cardId: null, card: manualCard(body.card) })
        if (body.photo) {
          const m = PHOTO_RE.exec(String(body.photo))
          if (!m || body.photo.length > PHOTO_MAX) throw new HttpError(400, 'Photo must be a JPEG under 450 KB')
          await writeBinary(photoKey(user.id, item.id), Buffer.from(m[1], 'base64'), 'image/jpeg')
          item.hasPhoto = true
        }
      }
      wallet.items.unshift(item)
      await saveWallet(user.id, wallet)
      return send(res, 201, { item })
    }

    if (req.method === 'PATCH') {
      const body = await readBody(req, 20_000)
      const wallet = await loadWallet(user.id)
      const it = wallet.items.find((x) => x.id === body.id)
      if (!it) throw new HttpError(404, 'Card not found in your wallet')
      if ('notes' in body) it.notes = cleanNotes(body.notes)
      if ('tags' in body) it.tags = cleanTags(body.tags)
      if ('favorite' in body) it.favorite = !!body.favorite
      if (body.card && !it.cardId) it.card = manualCard(body.card)
      it.updatedAt = new Date().toISOString()
      await saveWallet(user.id, wallet)
      return send(res, 200, { item: (await withLatest([it]))[0] })
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id')
      const wallet = await loadWallet(user.id)
      const it = wallet.items.find((x) => x.id === id)
      if (!it) throw new HttpError(404, 'Card not found in your wallet')
      wallet.items = wallet.items.filter((x) => x.id !== id)
      await saveWallet(user.id, wallet)
      if (it.hasPhoto) await removeKey(photoKey(user.id, it.id))
      return send(res, 200, { ok: true })
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    send(res, 405, { error: 'Method not allowed' })
  } catch (e) {
    handleError(res, e)
  }
}
