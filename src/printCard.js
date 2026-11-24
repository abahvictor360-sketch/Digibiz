// Draws print-ready business card faces (CR80: 85.6 × 54 mm) on a canvas at 300 DPI.
import QRCode from 'qrcode'
import { PATHS } from './components/Icon.jsx'
import { initials, websiteUrl } from './lib.js'

export const DPI = 300
const MM = DPI / 25.4
export const CARD_W = Math.round(85.6 * MM) // 1011
export const CARD_H = Math.round(54 * MM) // 638
export const BLEED = Math.round(2 * MM) // 24

const T = {
  glass: { bg: ['#565a82', '#8676b2', '#cea0c4'], fg: '#ffffff', muted: 'rgba(255,255,255,0.78)', ring: ['#ff9a5a', '#ff5fa2', '#b18cff'], avBg: '#1b1f3a', avFg: '#f5d58a', icBg: 'rgba(255,255,255,0.2)', icFg: '#ffffff', glow: 'rgba(255,255,255,0.28)', back: ['#3f4266', '#6b5f99'], backFg: '#ffffff', backMuted: 'rgba(255,255,255,0.75)', accent: '#ffd36a' },
  lime: { bg: ['#ffffff', '#ffffff', '#f2f9dd'], fg: '#111111', muted: '#6d7068', ring: ['#c6f24e', '#a9d82c', '#c6f24e'], avBg: '#111111', avFg: '#c6f24e', icBg: '#111111', icFg: '#c6f24e', glow: 'rgba(198,242,78,0.55)', back: ['#c6f24e', '#b4e43a'], backFg: '#111111', backMuted: '#2f3a10', accent: '#111111' },
  midnight: { bg: ['#1a2210', '#121212', '#0d0d0d'], fg: '#f4f5ef', muted: '#a3a59d', ring: ['#c6f24e', '#4ee0a0', '#c6f24e'], avBg: '#1d1d1d', avFg: '#c6f24e', icBg: '#c6f24e', icFg: '#111111', glow: 'rgba(198,242,78,0.18)', back: ['#121212', '#0b0b0b'], backFg: '#f4f5ef', backMuted: '#a3a59d', accent: '#c6f24e' },
  peach: { bg: ['#ffffff', '#fff3e6', '#ffd9bd'], fg: '#1a1410', muted: '#7a6a5e', ring: ['#ff9a5a', '#ffcf8a', '#ff9a5a'], avBg: '#1a1410', avFg: '#ffd9bd', icBg: '#1a1410', icFg: '#ffffff', glow: 'rgba(255,255,255,0.7)', back: ['#1a1410', '#2b2019'], backFg: '#fff3e6', backMuted: '#cdb8a6', accent: '#ff9a5a' },
  mono: { bg: ['#fafafa', '#fafafa', '#f1f1f1'], fg: '#111111', muted: '#555555', ring: ['#111111', '#111111', '#111111'], avBg: '#e9e9e9', avFg: '#111111', icBg: '#111111', icFg: '#ffffff', glow: 'rgba(0,0,0,0)', back: ['#111111', '#111111'], backFg: '#ffffff', backMuted: '#bbbbbb', accent: '#ffffff' },
}

const loadImg = (src) =>
  new Promise((res) => {
    if (!src) return res(null)
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = () => res(null)
    i.src = src
  })

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('700 64px Barlow'),
      document.fonts.load('600 32px Barlow'),
      document.fonts.load('500 28px Inter'),
      document.fonts.load('400 28px Inter'),
    ])
  } catch {
    /* fall back to system fonts */
  }
}

function icon(ctx, name, x, y, size, color, stroke = 2) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = stroke
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(new Path2D(PATHS[name]))
  ctx.restore()
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function fitText(ctx, text, maxW, font, startSize, minSize) {
  let size = startSize
  ctx.font = font(size)
  while (ctx.measureText(text).width > maxW && size > minSize) {
    size -= 2
    ctx.font = font(size)
  }
  if (ctx.measureText(text).width > maxW) {
    let t = text
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
    return t + '…'
  }
  return text
}

function background(ctx, w, h, th) {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, th.bg[0])
  g.addColorStop(0.5, th.bg[1])
  g.addColorStop(1, th.bg[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const r = ctx.createRadialGradient(w * 0.85, h * 0.1, 0, w * 0.85, h * 0.1, w * 0.6)
  r.addColorStop(0, th.glow)
  r.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = r
  ctx.fillRect(0, 0, w, h)
}

async function drawFront(ctx, card, th, o) {
  const W = CARD_W
  const H = CARD_H
  const pad = 70
  // Avatar
  const r = 92
  const cx = o + pad + r
  const cy = o + pad + r
  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  th.ring.forEach((c, i) => ring.addColorStop(i / (th.ring.length - 1), c))
  ctx.fillStyle = ring
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = th.avBg
  ctx.beginPath()
  ctx.arc(cx, cy, r - 9, 0, Math.PI * 2)
  ctx.fill()
  const img = await loadImg(card.avatar)
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r - 14, 0, Math.PI * 2)
  ctx.clip()
  if (img) {
    ctx.drawImage(img, cx - r + 14, cy - r + 14, (r - 14) * 2, (r - 14) * 2)
  } else {
    ctx.fillStyle = th.avFg
    ctx.font = '700 72px Barlow, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials(card.name), cx, cy + 4)
  }
  ctx.restore()

  // Name + role
  const tx = cx + r + 40
  const maxW = o + W - pad - tx
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = th.fg
  const name = fitText(ctx, card.name || 'Your Name', maxW, (s) => `700 ${s}px Barlow, sans-serif`, 66, 40)
  ctx.fillText(name, tx, cy - 6)
  ctx.fillStyle = th.muted
  if (card.title) {
    ctx.fillText(fitText(ctx, card.title, maxW, (s) => `500 ${s}px Inter, sans-serif`, 28, 20), tx, cy + 38)
  }
  if (card.company) {
    ctx.fillText(fitText(ctx, card.company, maxW, (s) => `500 ${s}px Inter, sans-serif`, 28, 20), tx, cy + (card.title ? 76 : 38))
  }

  // Contact rows
  const rows = [
    card.phone && ['phone', card.phone],
    card.email && ['mail', card.email],
    card.website && ['globe', websiteUrl(card.website).replace(/^https?:\/\//, '').replace(/\/$/, '')],
  ].filter(Boolean)
  const rowH = 54
  let y = o + H - pad - rows.length * rowH + 8
  for (const [ic, text] of rows) {
    rrect(ctx, o + pad, y, 40, 40, 12)
    ctx.fillStyle = th.icBg
    ctx.fill()
    icon(ctx, ic, o + pad + 8, y + 8, 24, th.icFg, 2)
    ctx.fillStyle = th.fg
    ctx.textBaseline = 'middle'
    ctx.fillText(fitText(ctx, text, W * 0.62, (s) => `500 ${s}px Inter, sans-serif`, 26, 18), o + pad + 58, y + 21)
    y += rowH
  }

  // Contactless mark
  const nx = o + W - pad - 64
  const ny = o + H - pad - 64
  rrect(ctx, nx, ny, 64, 64, 18)
  ctx.fillStyle = th.icBg
  ctx.fill()
  icon(ctx, 'nfc', nx + 14, ny + 14, 36, th.icFg, 2.2)
}

async function drawBack(ctx, card, th, o, url) {
  const W = CARD_W
  const H = CARD_H
  const g = ctx.createLinearGradient(0, 0, 0, H + o * 2)
  g.addColorStop(0, th.back[0])
  g.addColorStop(1, th.back[1])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W + o * 2, H + o * 2)

  const pad = 70
  const q = H - pad * 2 // QR box size
  const qx = o + pad
  const qy = o + pad
  rrect(ctx, qx, qy, q, q, 28)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, url, { width: q - 44, margin: 0, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } })
  ctx.drawImage(qr, qx + 22, qy + 22, q - 44, q - 44)

  const tx = qx + q + 56
  const maxW = o + W - pad - tx
  // NFC badge
  rrect(ctx, tx, qy + 6, 76, 76, 22)
  ctx.fillStyle = th.accent
  ctx.fill()
  icon(ctx, 'nfc', tx + 18, qy + 24, 40, th.back[0], 2.4)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = th.backFg
  ctx.font = '700 56px Barlow, sans-serif'
  ctx.fillText('Tap or scan', tx, qy + 160)
  ctx.fillText('to connect', tx, qy + 214)
  ctx.fillStyle = th.backMuted
  ctx.font = '400 24px Inter, sans-serif'
  const who = card.name ? `Save ${card.name.split(' ')[0]}’s contact` : 'Save my contact'
  ctx.fillText(fitText(ctx, who, maxW, (s) => `400 ${s}px Inter, sans-serif`, 24, 16), tx, qy + 258)
  ctx.fillText('in one tap.', tx, qy + 290)

  ctx.fillStyle = th.backFg
  const short = url.replace(/^https?:\/\//, '')
  ctx.fillText(fitText(ctx, short, maxW, (s) => `600 ${s}px Inter, sans-serif`, 22, 14), tx, qy + q - 8)
}

// side: 'front' | 'back'. bleed adds 2 mm of background on every edge for print shops.
export async function renderFace(side, card, url, { bleed = false } = {}) {
  await fontsReady()
  const o = bleed ? BLEED : 0
  const c = document.createElement('canvas')
  c.width = CARD_W + o * 2
  c.height = CARD_H + o * 2
  const ctx = c.getContext('2d')
  const th = T[card.theme] || T.glass
  if (side === 'front') {
    background(ctx, c.width, c.height, th)
    await drawFront(ctx, card, th, o)
  } else {
    await drawBack(ctx, card, th, o, url)
  }
  return c
}

export async function downloadFace(side, card, url, opts) {
  const c = await renderFace(side, card, url, opts)
  const a = document.createElement('a')
  a.href = c.toDataURL('image/png')
  a.download = `${(card.name || 'card').replace(/[^\w-]+/g, '_')}-${side}${opts?.bleed ? '-bleed' : ''}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
}
