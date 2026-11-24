import { readRecord, writeRecord } from '../_store.js'
import { cleanCard, newId, newToken, hashToken, readBody, send, handleError } from '../_card.js'

// POST /api/cards  -> create a card, returns { id, token }
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return send(res, 405, { error: 'Method not allowed' })
    }
    const body = await readBody(req)
    const card = cleanCard(body.card)
    const token = newToken()
    const now = new Date().toISOString()
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = newId()
      if (await readRecord(id)) continue
      try {
        await writeRecord(id, { card, tokenHash: hashToken(token), createdAt: now, updatedAt: now }, { create: true })
      } catch (e) {
        if (attempt < 4) continue
        throw e
      }
      return send(res, 201, { id, token, updatedAt: now })
    }
    throw new Error('Could not allocate an id')
  } catch (e) {
    handleError(res, e)
  }
}
