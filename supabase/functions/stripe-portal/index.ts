// Opens the Stripe customer portal (change plan, update card, cancel).
import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

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

    const { data: sub } = await admin.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
    if (!sub?.stripe_customer_id) return json(404, { error: 'No billing account yet' })

    const origin = Deno.env.get('APP_URL') || req.headers.get('origin') || ''
    const session = await stripe.billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: `${origin}/billing` })
    return json(200, { url: session.url })
  } catch (e) {
    console.error(e)
    return json(500, { error: 'Couldn’t open billing. Please try again.' })
  }
})
