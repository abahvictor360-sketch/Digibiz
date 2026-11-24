import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Icon from './Icon.jsx'

export default function QRModal({ url, name, note, onClose }) {
  const [src, setSrc] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: 'L', color: { dark: '#111111', light: '#ffffff' } })
      .then(setSrc)
      .catch(() => setErr('This card is too large for a QR code — try a smaller photo or a shorter bio.'))
  }, [url])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="QR code" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
        <h3>Scan to connect</h3>
        <p className="muted">Point a phone camera at the code to open {name ? `${name}’s` : 'this'} card.</p>
        {note && <p className="qr-note">{note}</p>}
        <div className="qr-box">{err ? <p className="qr-err">{err}</p> : src ? <img src={src} alt="QR code for the card link" /> : <div className="qr-skel" />}</div>
        {src && (
          <a className="btn btn-dark btn-block" href={src} download={`${(name || 'card').replace(/[^\w-]+/g, '_')}-qr.png`}>
            <Icon name="download" size={18} /> Download QR
          </a>
        )}
      </div>
    </div>
  )
}
