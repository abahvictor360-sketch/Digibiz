// Business-card wallet: photos in Supabase Storage, export helpers.
import { supabase, dbError } from './supabase.js'

export const BUCKET = 'card-photos'

export const EMPTY_CONTACT = {
  name: '',
  title: '',
  company: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  notes: '',
  met_where: '',
  met_on: '',
  tags: [],
  favorite: false,
  front_path: null,
  back_path: null,
}

export const FIELDS = ['name', 'title', 'company', 'phone', 'email', 'website', 'address', 'notes', 'met_where', 'met_on', 'tags', 'favorite', 'front_path', 'back_path']

// Shrink a photo to at most `max` px on the long side as JPEG (keeps uploads small).
export function shrinkPhoto(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that photo'))), 'image/jpeg', 0.85)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that photo'))
    }
    img.src = url
  })
}

export async function uploadPhoto(userId, blob, side) {
  const path = `${userId}/${crypto.randomUUID()}-${side}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw dbError(error)
  return path
}

export async function removePhotos(paths) {
  const list = paths.filter(Boolean)
  if (list.length) await supabase.storage.from(BUCKET).remove(list)
}

// Signed URLs for private photos, valid for an hour.
export async function signedUrls(paths) {
  const list = [...new Set(paths.filter(Boolean))]
  if (!list.length) return {}
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(list, 3600)
  if (error) throw dbError(error)
  return Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]))
}

const vEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
const site = (w) => (!w ? '' : /^https?:\/\//i.test(w) ? w : `https://${w}`)

export function contactToVCard(c) {
  const parts = (c.name || '').trim().split(/\s+/)
  const last = parts.length > 1 ? parts.pop() : ''
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vEsc(last)};${vEsc(parts.join(' '))};;;`, `FN:${vEsc(c.name)}`]
  if (c.company) lines.push(`ORG:${vEsc(c.company)}`)
  if (c.title) lines.push(`TITLE:${vEsc(c.title)}`)
  if (c.phone) lines.push(`TEL;TYPE=WORK,VOICE:${c.phone}`)
  if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${c.email}`)
  if (c.website) lines.push(`URL:${site(c.website)}`)
  if (c.address) lines.push(`ADR;TYPE=WORK:;;${vEsc(c.address)};;;;`)
  if (c.tags?.length) lines.push(`CATEGORIES:${c.tags.map(vEsc).join(',')}`)
  const note = [c.notes, c.met_where && `Met at: ${c.met_where}`, c.met_on && `Met on: ${c.met_on}`].filter(Boolean).join('\n')
  if (note) lines.push(`NOTE:${vEsc(note)}`)
  lines.push('END:VCARD')
  return lines.join('\r\n')
}

const CSV_COLS = [
  ['Name', 'name'], ['Title', 'title'], ['Company', 'company'], ['Phone', 'phone'], ['Email', 'email'],
  ['Website', 'website'], ['Address', 'address'], ['Met where', 'met_where'], ['Met on', 'met_on'],
  ['Tags', 'tags'], ['Notes', 'notes'], ['Added', 'created_at'],
]
const csvCell = (v) => {
  let s = Array.isArray(v) ? v.join('; ') : String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // stop spreadsheets running it as a formula
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export const contactsToCsv = (list) =>
  [CSV_COLS.map(([h]) => h).join(','), ...list.map((c) => CSV_COLS.map(([, k]) => csvCell(c[k])).join(','))].join('\r\n')

export function download(name, text, type) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export const normTag = (t) => t.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30)
