// POST /api/cards { card } -> publish the signed-in user's card (Pro only).
// The first publish creates the card and its permanent /c/:id link; later
// publishes update the same card.
import { isPro, publicUser, requireUser, saveUser } from '../_auth.js'
import { refreshBilling } from '../_billing.js'
import { readRecord, writeRecord } from '../_store.js'
import { HttpError, cleanCard, newId, readBody, send, handleError } from '../_card.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return send(res, 405, { error: 'Method not allowed' })
    }
    let user = await requireUser(req)
    user = await refreshBilling(user)
    if (!isPro(user)) throw new HttpError(402, 'Creating and publishing a card needs digibiz Pro')

    const body = await readBody(req)
    const card = cleanCard(body.card)
    const now = new Date().toISOString()

    if (user.cardId) {
      const rec = await readRecord(user.cardId)
      if (rec) {
        await writeRecord(user.cardId, { ...rec, card, ownerId: user.id, updatedAt: now })
        return send(res, 200, { id: user.cardId, updatedAt: now, user: publicUser(user) })
      }
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const id = newId()
      try {
        await writeRecord(id, { card, ownerId: user.id, createdAt: now, updatedAt: now }, { create: true })
      } catch {
        continue // id taken, try another
      }
      user = { ...user, cardId: id }
      await saveUser(user)
      return send(res, 201, { id, updatedAt: now, user: publicUser(user) })
    }
    throw new Error('Could not allocate an id')
  } catch (e) {
    handleError(res, e)
  }
}
