# digibiz: Smart Digital Business Cards

Create a digital business card, publish it to a short permanent link, and put that link on a physical NFC card.

## Pages
- `/`: landing page
- `/create`: card editor with live preview and **Publish**
- `/c/:id`: public card page (Save contact / Share / QR)
- `/nfc`: write your link to an NFC card (Web NFC on Android Chrome; NFC Tools instructions for iPhone) and download print-ready card artwork (front + back, 300 DPI, 85.6 × 54 mm, 2 mm bleed)
- `/pricing`, `/contact`

## Plans
- **Wallet (free):** sign up, then save business cards: digibiz cards (from their page, QR scan, NFC tap or link) and paper cards (details + photo). Notes, tags, favourites, search. Saved digibiz cards always show the owner's latest details.
- **Pro (monthly, Stripe):** publish your own card to a permanent `/c/:id` link, QR code, NFC writer, print designs.

## API (Vercel Functions, storage in a private Vercel Blob store)
- `GET/POST /api/auth`: session (signed cookie), sign up, sign in, sign out. Passwords hashed with scrypt.
- `GET/POST/PATCH/DELETE /api/wallet`: the signed-in user's saved cards and paper-card photos.
- `POST /api/cards`: publish the signed-in user's card (Pro only). `GET /api/cards/:id`: public card.
- `GET/POST /api/billing`: Stripe Checkout, confirmation and billing portal. Subscriptions are re-checked with Stripe every few hours, so no webhook is needed.

## Environment variables (Vercel project settings)
| Name | Required | Purpose |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | yes | Added automatically by the connected Blob store |
| `SESSION_SECRET` | yes | Signs sign-in cookies (already set) |
| `STRIPE_SECRET_KEY` | for payments | Stripe secret key (`sk_live_…` or `sk_test_…`). Until it is set, the Go Pro button says payments are coming soon |
| `PRO_PRICE_CENTS` | no | Monthly price in cents (default `600`) |
| `PRO_CURRENCY` | no | Currency code (default `usd`) |
| `PRO_EMAILS` | no | Comma-separated emails that get Pro free (for the owner and testers) |

## Develop
```bash
npm install
npm run dev      # http://localhost:5173 (/api runs locally, saving data to .local-store/)
PRO_EMAILS=you@example.com npm run dev   # give an account Pro locally
npm run build
```

Contact form recipient: `src/config.js`.
