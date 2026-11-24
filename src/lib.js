// Card data model, themes, sharing helpers.

export const SOCIALS = [
  { key: 'linkedin', label: 'LinkedIn', color: '#0a66c2', url: (v) => (isUrl(v) ? v : `https://linkedin.com/in/${clean(v)}`) },
  { key: 'x', label: 'X', color: '#111111', url: (v) => (isUrl(v) ? v : `https://x.com/${clean(v)}`) },
  { key: 'instagram', label: 'Instagram', color: '#e1306c', url: (v) => (isUrl(v) ? v : `https://instagram.com/${clean(v)}`) },
  { key: 'facebook', label: 'Facebook', color: '#1877f2', url: (v) => (isUrl(v) ? v : `https://facebook.com/${clean(v)}`) },
  { key: 'tiktok', label: 'TikTok', color: '#111111', url: (v) => (isUrl(v) ? v : `https://tiktok.com/@${clean(v)}`) },
  { key: 'youtube', label: 'YouTube', color: '#ff0033', url: (v) => (isUrl(v) ? v : `https://youtube.com/@${clean(v)}`) },
  { key: 'github', label: 'GitHub', color: '#24292f', url: (v) => (isUrl(v) ? v : `https://github.com/${clean(v)}`) },
  { key: 'whatsapp', label: 'WhatsApp', color: '#25d366', url: (v) => (isUrl(v) ? v : `https://wa.me/${v.replace(/[^\d]/g, '')}`) },
]

export const THEMES = [
  { key: 'glass', label: 'Aurora glass' },
  { key: 'lime', label: 'Lime fresh' },
  { key: 'midnight', label: 'Midnight' },
  { key: 'peach', label: 'Peach' },
  { key: 'mono', label: 'Mono' },
]

function isUrl(v) {
  return /^https?:\/\//i.test(v)
}
function clean(v) {
  return v.trim().replace(/^@/, '')
}

export const EMPTY_CARD = {
  name: '',
  title: '',
  company: '',
  bio: '',
  phone: '',
  email: '',
  website: '',
  location: '',
  avatar: '',
  theme: 'glass',
  socials: {},
}

export const SAMPLE_CARD = {
  name: 'John Doe',
  title: 'Founder & Creative Director',
  company: 'Northwind Studio',
  bio: 'Brand strategy, web design & growth marketing. Let’s build something people remember.',
  phone: '+234 801 234 5678',
  email: 'hello@northwind.studio',
  website: 'northwind.studio',
  location: 'Lagos, Nigeria',
  avatar: '',
  theme: 'glass',
  socials: { linkedin: 'johndoe', instagram: 'northwind.studio', x: 'johndoe', whatsapp: '+2348012345678' },
}

export function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'DB'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function websiteUrl(w) {
  if (!w) return ''
  return isUrl(w) ? w : `https://${w}`
}

// Compact key map keeps share links short.
const KEYMAP = { name: 'n', title: 't', company: 'c', bio: 'b', phone: 'p', email: 'e', website: 'w', location: 'l', avatar: 'a', theme: 'h', socials: 's' }

export function encodeCard(card) {
  const out = {}
  for (const [k, short] of Object.entries(KEYMAP)) {
    const v = card[k]
    if (k === 'socials') {
      const s = Object.fromEntries(Object.entries(v || {}).filter(([, x]) => x && x.trim()))
      if (Object.keys(s).length) out[short] = s
    } else if (v) out[short] = v
  }
  const bytes = new TextEncoder().encode(JSON.stringify(out))
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeCard(str) {
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64 + '==='.slice((b64.length + 3) % 4))
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const raw = JSON.parse(new TextDecoder().decode(bytes))
    const card = { ...EMPTY_CARD, socials: {} }
    for (const [k, short] of Object.entries(KEYMAP)) if (raw[short] != null) card[k] = raw[short]
    if (typeof card.socials !== 'object' || !card.socials) card.socials = {}
    if (!THEMES.some((t) => t.key === card.theme)) card.theme = 'glass'
    if (card.avatar && !/^(data:image\/(png|jpe?g|webp);base64,|https:\/\/)/.test(card.avatar)) card.avatar = ''
    return card
  } catch {
    return null
  }
}

export function shareUrl(card) {
  return `${window.location.origin}/c#${encodeCard(card)}`
}

// QR codes hold ~2.9KB, so an uploaded photo is left out of the QR link.
export function qrUrl(card) {
  const hasPhoto = /^data:/.test(card.avatar || '')
  return { url: shareUrl(hasPhoto ? { ...card, avatar: '' } : card), photoDropped: hasPhoto }
}

function vEsc(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

export function toVCard(card, link) {
  const parts = (card.name || '').trim().split(/\s+/)
  const last = parts.length > 1 ? parts.pop() : ''
  const first = parts.join(' ')
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${vEsc(last)};${vEsc(first)};;;`,
    `FN:${vEsc(card.name)}`,
  ]
  if (card.company) lines.push(`ORG:${vEsc(card.company)}`)
  if (card.title) lines.push(`TITLE:${vEsc(card.title)}`)
  if (card.phone) lines.push(`TEL;TYPE=CELL:${card.phone}`)
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${card.email}`)
  if (card.website) lines.push(`URL:${websiteUrl(card.website)}`)
  if (card.location) lines.push(`ADR;TYPE=WORK:;;${vEsc(card.location)};;;;`)
  if (card.bio) lines.push(`NOTE:${vEsc(card.bio)}`)
  for (const s of SOCIALS) {
    const v = card.socials?.[s.key]
    if (v) lines.push(`X-SOCIALPROFILE;TYPE=${s.key}:${s.url(v)}`)
  }
  if (link) lines.push(`item1.URL:${link}`, 'item1.X-ABLabel:Digital card')
  const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/.exec(card.avatar || '')
  if (m) lines.push(`PHOTO;ENCODING=b;TYPE=${m[1] === 'png' ? 'PNG' : 'JPEG'}:${m[2]}`)
  lines.push('END:VCARD')
  return lines.join('\r\n')
}

export function downloadVCard(card, link) {
  const blob = new Blob([toVCard(card, link)], { type: 'text/vcard;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${(card.name || 'contact').replace(/[^\w-]+/g, '_')}.vcf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// Resize an uploaded image to a small square JPEG so it fits in a share link.
export function resizeImage(file, size = 128) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = c.height = size
      const ctx = c.getContext('2d')
      const s = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = reject
    img.src = url
  })
}

const STORE_KEY = 'digibiz:card'
export function loadDraft() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? { ...EMPTY_CARD, ...JSON.parse(raw) } : null
  } catch {
    return null
  }
}
export function saveDraft(card) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(card))
  } catch {
    /* storage unavailable or full */
  }
}
