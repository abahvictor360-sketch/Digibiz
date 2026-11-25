# digibiz: Smart Digital Business Cards

- **Free:** a card wallet for the business cards people hand you (photos of front and back, notes, tags, search, vCard/CSV export).
- **Pro ($6/month or $5/month billed yearly, via Stripe):** create and publish your own digital card with a short permanent link, QR code and NFC card. Without an active Pro plan, published cards go offline (nothing is deleted) until the owner resubscribes.

## Pages
- `/`: landing page
- `/create`: card editor with live preview and **Publish**
- `/c/:id`: public card page (Save contact / Share / QR)
- `/nfc`: write your link to an NFC card (Web NFC on Android Chrome; NFC Tools instructions for iPhone) and download print-ready card artwork (front + back, 300 DPI, 85.6 × 54 mm, 2 mm bleed)
- `/pricing`, `/contact` (messages are saved to the database)
- `/login`: sign in, create an account, reset password
- `/wallet`: free card wallet
- `/billing`: plan, Stripe checkout and customer portal
- `/dashboard`: your cards (views, live/off switch, edit, QR, NFC, delete), 30-day views chart, account settings
- `/admin`: admin dashboard (users and roles, every card, contact inbox, site-wide stats)

## Database (Supabase)
Schema, Row Level Security and functions live in `supabase/migrations/`. Tables: `profiles` (one per account, `role` = `user` | `admin`, `comped` = free Pro given by an admin), `subscriptions` (kept in sync by the Stripe webhook), `cards`, `card_views`, `saved_contacts` (the wallet), `contact_messages`. Wallet photos live in the private Storage bucket `card-photos`, under a folder per user.

- Designing a card in `/create` is free and needs no account. Publishing calls `create_card` / `update_card`, which require a signed-in user with Pro (`is_pro`: admin, comped, or a Stripe subscription that is `active`, `trialing` or `past_due`).
- Public pages read cards through `get_card`, which returns nothing when the card is turned off or its owner no longer has Pro; `record_card_view` counts views.
- Card fields are validated in the database (`sanitize_card`), so the rules can't be bypassed from the browser.

The Supabase URL and publishable key are in `src/config.js` (safe to ship; override with `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`).

## Payments (Stripe)
Three Supabase Edge Functions in `supabase/functions/` are deployed:
- `stripe-checkout`: starts Stripe Checkout ($6/month or $60/year; the prices are set in code, so nothing needs creating in Stripe).
- `stripe-portal`: opens the Stripe customer portal (change plan, update card, cancel, invoices).
- `stripe-webhook`: verifies Stripe's signature and updates `subscriptions` through `apply_stripe_subscription`.

To switch payments on:
1. In Stripe → Developers → Webhooks, add the endpoint `https://mctrsqbupbptlrqjamid.supabase.co/functions/v1/stripe-webhook` with the events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`.
2. In Supabase → Edge Functions → Secrets, add `STRIPE_SECRET_KEY` (your `sk_test_…` or `sk_live_…` key) and `STRIPE_WEBHOOK_SECRET` (the endpoint's `whsec_…` signing secret). Optionally add `APP_URL` (e.g. `https://digibiz.app`) so Stripe always returns people to your main domain.
3. In Stripe → Settings → Billing → Customer portal, save the portal settings once (Stripe requires this before the portal opens).

Until the secrets are set, the Upgrade button says payments aren't set up yet. Admins can still give anyone Pro for free from `/admin`.

### Make yourself admin
Sign up on the site, then run in the Supabase SQL editor:
```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```
After that, promote or demote others from `/admin`.

### Auth settings to check
In Supabase → Authentication → URL Configuration, set **Site URL** to your production domain and add `https://<your-domain>/**` (and `http://localhost:5173/**` for development) to **Redirect URLs**, so confirmation and password-reset emails link back to the app.

Cards published before the database existed (Vercel Blob, `/api/cards`) still open: `/c/:id` falls back to the old API when a card isn't in the database.

## Develop
```bash
npm install
npm run dev      # http://localhost:5173 (uses the Supabase project in src/config.js)
npm run build
```

Contact form recipient: `src/config.js`.
