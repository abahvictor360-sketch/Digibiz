import { readRecord, writeRecord } from '../_store.js'
import { cleanCard, readBody, send, handleError, tokenMatches, ID_RE, HttpError } from '../_card.js'

// GET /api/cards/:id  -> public card
// PUT /api/cards/:id  -> update (Authorization: Bearer <token>)
export default async function handler(req, res) {
  try {
    const id = new URL(req.url, 'http://x').pathname.split('/').filter(Boolean).pop()
    if (!ID_RE.test(id || '')) throw new HttpError(404, 'Card not found')

    if (req.method === 'GET') {
      const rec = await readRecord(id)
      if (!rec) throw new HttpError(404, 'Card not found')
      return send(res, 200, { id, card: rec.card, updatedAt: rec.updatedAt })
    }

    if (req.method === 'PUT') {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
      const rec = await readRecord(id)
      if (!rec) throw new HttpError(404, 'Card not found')
      if (!tokenMatches(token, rec.tokenHash)) throw new HttpError(403, 'This browser can’t edit that card')
      const body = await readBody(req)
      const card = cleanCard(body.card)
      const updatedAt = new Date().toISOString()
      await writeRecord(id, { ...rec, card, updatedAt })
      return send(res, 200, { id, updatedAt })
    }

    res.setHeader('Allow', 'GET, PUT')
    send(res, 405, { error: 'Method not allowed' })
  } catch (e) {
    handleError(res, e)
  }
}
