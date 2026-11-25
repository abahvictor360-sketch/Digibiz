// GET  /api/billing                          -> { ready, priceCents, currency }
// POST /api/billing { action: 'checkout' }   -> { url } Stripe Checkout for Pro
// POST /api/billing { action: 'confirm', sessionId } -> { user } after returning from Checkout
// POST /api/billing { action: 'portal' }     -> { url } Stripe billing portal
import { publicUser, requireUser, saveUser } from './_auth.js'
import { refreshBilling, siteOrigin } from './_billing.js'
import { HttpError, handleError, readBody, send } from './_card.js'
import { billingFrom, currency, priceCents, stripe, stripeReady } from './_stripe.js'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return send(res, 200, { ready: stripeReady(), priceCents: priceCents(), currency: currency() })
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return send(res, 405, { error: 'Method not allowed' })
    }
    const body = await readBody(req, 5_000)
    let user = await requireUser(req)
    const origin = siteOrigin(req)

    if (body.action === 'checkout') {
      user = await refreshBilling(user, { force: true })
      if (publicUser(user).pro) throw new HttpError(409, 'You already have Pro')
      let customerId = user.billing?.customerId
      if (!customerId) {
        const customer = await stripe('POST', 'customers', { email: user.email, name: user.name || undefined, metadata: { userId: user.id } })
        customerId = customer.id
        user = { ...user, billing: { ...(user.billing || {}), customerId } }
        await saveUser(user)
      }
      const session = await stripe('POST', 'checkout/sessions', {
        mode: 'subscription',
        customer: customerId,
        client_reference_id: user.id,
        allow_promotion_codes: true,
        line_items: {
          0: {
            quantity: 1,
            price_data: {
              currency: currency(),
              unit_amount: priceCents(),
              recurring: { interval: 'month' },
              product_data: { name: 'digibiz Pro', description: 'Create, publish and share your digital business card' },
            },
          },
        },
        subscription_data: { metadata: { userId: user.id } },
        success_url: `${origin}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing?checkout=cancelled`,
      })
      return send(res, 200, { url: session.url })
    }

    if (body.action === 'confirm') {
      const id = String(body.sessionId || '')
      if (!/^cs_[A-Za-z0-9_]+$/.test(id)) throw new HttpError(400, 'Invalid checkout session')
      const session = await stripe('GET', `checkout/sessions/${id}`, { expand: { 0: 'subscription' } })
      if (session.client_reference_id !== user.id) throw new HttpError(403, 'This checkout belongs to another account')
      if (session.subscription && typeof session.subscription === 'object') {
        user = { ...user, billing: billingFrom(session.subscription, session.customer) }
        await saveUser(user)
      }
      return send(res, 200, { user: publicUser(user) })
    }

    if (body.action === 'portal') {
      const customerId = user.billing?.customerId
      if (!customerId) throw new HttpError(400, 'No billing account yet')
      const portal = await stripe('POST', 'billing_portal/sessions', { customer: customerId, return_url: `${origin}/account` })
      return send(res, 200, { url: portal.url })
    }

    if (body.action === 'refresh') {
      user = await refreshBilling(user, { force: true })
      return send(res, 200, { user: publicUser(user) })
    }

    throw new HttpError(400, 'Unknown action')
  } catch (e) {
    handleError(res, e)
  }
}
