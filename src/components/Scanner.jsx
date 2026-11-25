import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

// Pulls a digibiz card id out of a scanned link, e.g. https://digibiz-beta.vercel.app/c/ab12cd34
export function cardIdFrom(text) {
  try {
    const u = new URL(String(text).trim())
    const m = /^\/c\/([a-z0-9]{6,16})\/?$/.exec(u.pathname)
    return m ? m[1] : ''
  } catch {
    const m = /\/c\/([a-z0-9]{6,16})\b/.exec(String(text))
    return m ? m[1] : ''
  }
}

// Minimal vCard reader for QR codes on other business cards.
export function parseVCard(text) {
  if (!/BEGIN:VCARD/i.test(text)) return null
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const card = { name: '', title: '', company: '', phone: '', email: '', website: '', location: '', bio: '', socials: {}, theme: 'mono' }
  const val = (l) => l.slice(l.indexOf(':') + 1).replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ').trim()
  for (const l of lines) {
    const key = l.split(/[;:]/)[0].toUpperCase()
    if (key === 'FN') card.name ||= val(l)
    else if (key === 'N' && !card.name) card.name = val(l).split(';').reverse().filter(Boolean).join(' ').trim()
    else if (key === 'ORG') card.company ||= val(l).split(';')[0]
    else if (key === 'TITLE') card.title ||= val(l)
    else if (key === 'TEL') card.phone ||= val(l)
    else if (key === 'EMAIL') card.email ||= val(l)
    else if (key === 'URL') card.website ||= val(l)
    else if (key === 'ADR') card.location ||= val(l).split(';').filter(Boolean).join(', ')
    else if (key === 'NOTE') card.bio ||= val(l).slice(0, 160)
  }
  return card.name || card.company ? card : null
}

// Live camera QR scanner. Uses the browser's BarcodeDetector when available, jsQR otherwise.
export function QRScanner({ onResult }) {
  const video = useRef(null)
  const [error, setError] = useState('')
  const done = useRef(false)

  useEffect(() => {
    let stream
    let raf
    let stopped = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser can’t use the camera. Try Chrome or Safari, or add the card another way.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch (e) {
        setError(e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow the camera for this site and try again.' : 'Couldn’t open the camera.')
        return
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop())
      const v = video.current
      v.srcObject = stream
      await v.play().catch(() => {})

      let detector = null
      if ('BarcodeDetector' in window) {
        try {
          detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        } catch {
          detector = null
        }
      }
      const jsQR = detector ? null : (await import('jsqr')).default

      const tick = async () => {
        if (stopped || done.current) return
        if (v.readyState >= 2 && v.videoWidth) {
          let text = ''
          if (detector) {
            const codes = await detector.detect(v).catch(() => [])
            text = codes[0]?.rawValue || ''
          } else {
            const w = Math.min(640, v.videoWidth)
            const h = Math.round((v.videoHeight / v.videoWidth) * w)
            canvas.width = w
            canvas.height = h
            ctx.drawImage(v, 0, 0, w, h)
            const img = ctx.getImageData(0, 0, w, h)
            text = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })?.data || ''
          }
          if (text) {
            done.current = true
            navigator.vibrate?.(60)
            onResult(text)
            return
          }
        }
        raf = requestAnimationFrame(tick)
      }
      tick()
    }
    start()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onResult])

  return (
    <div className="scanner">
      {error ? (
        <p className="scanner-error">{error}</p>
      ) : (
        <>
          <video ref={video} playsInline muted />
          <div className="scanner-frame" aria-hidden="true" />
          <p className="scanner-hint">
            <Icon name="qr" size={16} /> Point at a digibiz QR code or any vCard QR
          </p>
        </>
      )}
    </div>
  )
}

// Reads a link from an NFC card (Android Chrome).
export function useNfcRead() {
  const supported = typeof window !== 'undefined' && 'NDEFReader' in window
  const read = (onText, onError) => {
    const ctrl = new AbortController()
    const ndef = new window.NDEFReader()
    ndef
      .scan({ signal: ctrl.signal })
      .then(() => {
        ndef.onreading = (ev) => {
          const dec = new TextDecoder()
          const rec = ev.message.records.find((r) => ['url', 'absolute-url', 'text'].includes(r.recordType) || r.mediaType === 'text/vcard')
          ctrl.abort()
          if (!rec) return onError('That NFC card has no link on it.')
          onText(dec.decode(rec.data))
        }
        ndef.onreadingerror = () => onError('Couldn’t read that NFC card. Hold it still and try again.')
      })
      .catch((e) => onError(e.name === 'NotAllowedError' ? 'NFC permission was blocked.' : 'NFC is off or unavailable on this phone.'))
    return () => ctrl.abort()
  }
  return { supported, read }
}
