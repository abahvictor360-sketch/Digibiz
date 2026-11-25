// Minimal Stripe REST client (no SDK needed).
import { HttpError } from './_card.js'

export const stripeReady = () => !!process.env.STRIPE_SECRET_KEY
export const priceCents = () => Number(process.env.PRO_PRICE_CENTS || 600)
export const currency = () => (process.env.PRO_CURRENCY || 'usd').toLowerCase()

function form(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue
    const key = prefix ? `${prefix}[${k}]` : k
    if (typeof v === 'object') form(v, key, out)
    else out.append(key, String(v))
  }
  return out
}

export async function stripe(method, path, params) {
  if (!stripeReady()) throw new HttpError(503, 'Payments aren’t switched on yet. Please check back soon.')
  const url = new URL(`${process.env.STRIPE_API_BASE || 'https://api.stripe.com'}/v1/${path}`)
  const init = { method, headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
  if (params && method === 'GET') {
    for (const [k, v] of form(params)) url.searchParams.append(k, v)
  } else if (params) {
    init.body = form(params)
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Stripe error', res.status, data?.error?.message)
    throw new HttpError(502, data?.error?.message || 'Payment provider error')
  }
  return data
}

// Flatten a Stripe subscription into what we store on the user.
export function billingFrom(sub, customerId) {
  const item = sub.items?.data?.[0]
  return {
    customerId: customerId || (typeof sub.customer === 'string' ? sub.customer : sub.customer?.id),
    subscriptionId: sub.id,
    status: sub.status,
    periodEnd: sub.current_period_end || item?.current_period_end || null,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    checkedAt: Date.now(),
  }
}
