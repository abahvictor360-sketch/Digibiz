# Digibiz — Smart Digital Business Cards

A web app for creating, sharing and saving digital business cards.

- **Landing page** (`/`): product overview, features, pricing, FAQ.
- **Card editor** (`/create`): live preview, photo upload, contact details, social links, 5 themes.
- **Public card** (`/c#…`): the shareable card page, with **Save contact** (vCard download), share, and QR code.

No backend: each card is encoded in its share link (`/c#<base64url JSON>`), and drafts are stored in the browser's localStorage. Uploaded photos are resized to 128px so the link stays short. The QR code leaves the photo out so the code stays scannable.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

## Deploy

Deployed on Vercel as a Vite app. `vercel.json` rewrites every route to `index.html` so `/create` and `/c` load directly.
