// Receives Stripe events and keeps public.subscriptions in sync.
// Deployed with JWT verification off: Stripe signs requests instead
// (STRIPE_WEBHOOK_SECRET). Events to send: checkout.session.completed,
// customer.subscription.created / updated / deleted / paused / resumed.
import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const crypto = Stripe.createSubtleCryptoProvider()

Deno.serve(async (req) => {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!key || !secret) return new Response('Not configured', { status: 503 })
  const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() })

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), req.headers.get('stripe-signature') || '', secret, undefined, crypto)
  } catch {
    return new Response('Bad signature', { status: 400 })
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const apply = async (sub: Stripe.Subscription) => {
    const { error } = await admin.rpc('apply_stripe_subscription', { p_sub: sub })
    if (error) throw error
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session
      if (s.mode === 'subscription' && s.subscription) {
        await apply(await stripe.subscriptions.retrieve(String(s.subscription)))
      }
    } else if (event.type.startsWith('customer.subscription.')) {
      await apply(event.data.object as Stripe.Subscription)
    }
    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response('Handler error', { status: 500 })
  }
})
