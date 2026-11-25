import { api } from './lib.js'

export const listWallet = () => api('/api/wallet').then((d) => d.items)
export const saveCardId = (cardId) => api('/api/wallet', { method: 'POST', body: JSON.stringify({ cardId }) })
export const saveManual = (card, extra = {}) => api('/api/wallet', { method: 'POST', body: JSON.stringify({ card, ...extra }) }).then((d) => d.item)
export const updateItem = (id, patch) => api('/api/wallet', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }).then((d) => d.item)
export const removeItem = (id) => api(`/api/wallet?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
export const photoUrl = (id) => `/api/wallet?photo=${encodeURIComponent(id)}`

// Shrinks a photo of a paper card so it uploads quickly (max 1280px JPEG).
export function shrinkPhoto(file, max = 1280) {
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
      let q = 0.8
      let out = c.toDataURL('image/jpeg', q)
      while (out.length > 580_000 && q > 0.35) {
        q -= 0.1
        out = c.toDataURL('image/jpeg', q)
      }
      resolve(out)
    }
    img.onerror = reject
    img.src = url
  })
}
