# digibiz: Smart Digital Business Cards

Create a digital business card, publish it to a short permanent link, and put that link on a physical NFC card.

## Pages
- `/`: landing page
- `/create`: card editor with live preview and **Publish**
- `/c/:id`: public card page (Save contact / Share / QR)
- `/nfc`: write your link to an NFC card (Web NFC on Android Chrome; NFC Tools instructions for iPhone) and download print-ready card artwork (front + back, 300 DPI, 85.6 × 54 mm, 2 mm bleed)
- `/pricing`, `/contact` (messages are saved to the database)
- `/login`: sign in, create an account, reset password
- `/dashboard`: your cards (views, live/off switch, edit, QR, NFC, delete), 30-day views chart, account settings
- `/admin`: admin dashboard (users and roles, every card, contact inbox, site-wide stats)

## Database (Supabase)
Schema, Row Level Security and functions live in `supabase/migrations/`. Tables: `profiles` (one per account, `role` = `user` | `admin`), `cards`, `card_views`, `contact_messages`.

- Anyone can publish without an account: `create_card` returns `{ id, token }`; the browser keeps the token and sends it to `update_card`. Only a SHA-256 hash is stored.
- Signed-in users own the cards they create. A card published from a browser before signing in is attached to the account (`claim_card`) when the dashboard opens.
- Public pages read cards through `get_card` (cards turned off return nothing); `record_card_view` counts views.
- Card fields are validated in the database (`sanitize_card`), so the rules can't be bypassed from the browser.

The Supabase URL and publishable key are in `src/config.js` (safe to ship; override with `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`).

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
