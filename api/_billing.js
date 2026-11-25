// Keeps a user's stored subscription in sync with Stripe.
import { saveUser } from './_auth.js'
import { billingFrom, stripe, stripeReady } from './_stripe.js'

const SIX_HOURS = 6 * 3600 * 1000

// Re-checks the subscription with Stripe when the stored copy is stale or the
// paid period has ended. Returns the (possibly updated) user.
export async function refreshBilling(user, { force = false } = {}) {
  const b = user?.billing
  if (!b?.subscriptionId || !stripeReady()) return user
  const periodOver = b.periodEnd && b.periodEnd * 1000 < Date.now()
  const stale = !b.checkedAt || Date.now() - b.checkedAt > SIX_HOURS
  if (!force && !periodOver && !stale) return user
  try {
    const sub = await stripe('GET', `subscriptions/${b.subscriptionId}`)
    const next = { ...user, billing: billingFrom(sub, b.customerId) }
    await saveUser(next)
    return next
  } catch (e) {
    console.error('Billing refresh failed', e.message)
    return user
  }
}

export function siteOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '')
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || (process.env.LOCAL_STORE_DIR ? 'http' : 'https')
  return `${proto}://${host}`
}
