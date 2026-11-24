# digibiz: Smart Digital Business Cards

Create a digital business card, publish it to a short permanent link, and put that link on a physical NFC card.

## Pages
- `/`: landing page
- `/create`: card editor with live preview and **Publish**
- `/c/:id`: public card page (Save contact / Share / QR)
- `/nfc`: write your link to an NFC card (Web NFC on Android Chrome; NFC Tools instructions for iPhone) and download print-ready card artwork (front + back, 300 DPI, 85.6 × 54 mm, 2 mm bleed)
- `/pricing`, `/contact`

## How publishing works
`POST /api/cards` stores the card and returns `{ id, token }`. The browser keeps the token in localStorage and sends it as `Authorization: Bearer <token>` with `PUT /api/cards/:id` to update. Only a SHA-256 hash of the token is stored. `GET /api/cards/:id` returns the public card.

Cards live in a private **Vercel Blob** store (`BLOB_READ_WRITE_TOKEN`, added automatically when the store is connected to the project). Old `/c#…` links that carry the card in the URL still open.

The NFC chip only holds the short link (~40 bytes), so any NTAG213/215/216 card works, and editing the card never requires rewriting the chip.

## Develop
```bash
npm install
npm run dev      # http://localhost:5173 (/api runs locally, saving cards to .local-store/)
npm run build
```

Contact form recipient: `src/config.js`.
