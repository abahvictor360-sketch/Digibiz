// Starts a Stripe Checkout for digibiz Pro ($6/month or $60/year).
// Needs the STRIPE_SECRET_KEY secret. The user id is stored on the
// subscription's metadata so the webhook can link it back to the account.
import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const PRICES = { month: 600, year: 6000 } as const
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const key = Deno.env.get('STRIPE_SECRET_KEY')
    if (!key) return json(503, { error: 'Payments aren’t set up yet. Please try again later.' })
    const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() })
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: { user } } = await admin.auth.getUser(jwt)
    if (!user) return json(401, { error: 'Sign in first' })

    const { interval = 'month', returnTo = '/billing' } = await req.json().catch(() => ({}))
    if (!(interval in PRICES)) return json(400, { error: 'Unknown plan' })
    const origin = Deno.env.get('APP_URL') || req.headers.get('origin') || ''
    if (!/^https?:\/\//.test(origin)) return json(400, { error: 'Unknown site address' })
    const back = typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/billing'

    const { data: sub } = await admin.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()
    if (sub && ['active', 'trialing', 'past_due'].includes(sub.status)) {
      return json(409, { error: 'You already have digibiz Pro. Use “Manage billing” to change it.' })
    }

    let customer = sub?.stripe_customer_id as string | undefined
    if (!customer) {
      const c = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } })
      customer = c.id
      await admin.from('subscriptions').upsert({ user_id: user.id, stripe_customer_id: customer, status: 'incomplete', updated_at: new Date().toISOString() })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: PRICES[interval as keyof typeof PRICES],
          recurring: { interval },
          product_data: { name: 'digibiz Pro', description: 'Create, publish and share digital business cards' },
        },
      }],
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${origin}${back}${back.includes('?') ? '&' : '?'}checkout=success`,
      cancel_url: `${origin}${back}${back.includes('?') ? '&' : '?'}checkout=cancelled`,
    })
    return json(200, { url: session.url })
  } catch (e) {
    console.error(e)
    return json(500, { error: 'Couldn’t start checkout. Please try again.' })
  }
})
