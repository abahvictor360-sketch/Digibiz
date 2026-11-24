import { useEffect, useMemo, useState } from 'react'
import BusinessCard from '../components/BusinessCard.jsx'
import QRModal from '../components/QRModal.jsx'
import Icon from '../components/Icon.jsx'
import { useToast, shareOrCopy } from '../components/Toast.jsx'
import { Link, useLocation } from '../router.jsx'
import { qrUrl, decodeCard, downloadVCard } from '../lib.js'

export default function CardView() {
  const { hash } = useLocation()
  const card = useMemo(() => (hash.length > 1 ? decodeCard(hash.slice(1)) : null), [hash])
  const [qr, setQr] = useState(false)
  const [toast, showToast] = useToast()
  const url = window.location.href

  useEffect(() => {
    document.title = card?.name ? `${card.name} — digibiz card` : 'digibiz card'
    return () => {
      document.title = 'digibiz — Smart Digital Business Cards'
    }
  }, [card])

  if (!card) {
    return (
      <div className={`card-page theme-bg-glass`}>
        <div className="card-missing">
          <div className="missing-icon">
            <Icon name="link" size={28} />
          </div>
          <h1>This card link looks incomplete</h1>
          <p className="muted">Ask the sender to share their link again, or make a card of your own.</p>
          <Link to="/create" className="btn btn-dark">
            Create your card <Icon name="arrow" size={18} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`card-page theme-bg-${card.theme}`}>
      <div className="card-page-inner">
        <BusinessCard card={card} tilt onSave={() => downloadVCard(card, url)} onShare={() => shareOrCopy(url, card.name, showToast)} onQR={() => setQr(true)} />
        <Link to="/create" className="made-with">
          <span className="logo-mark small">
            <span />
          </span>
          Make your own free card with <strong>digibiz</strong>
          <Icon name="arrow" size={16} />
        </Link>
      </div>
      {qr && (() => {
        const q = qrUrl(card)
        return <QRModal url={q.url} name={card.name} note={q.photoDropped ? 'Your photo is left out of the QR version to keep the code scannable. The share link includes it.' : ''} onClose={() => setQr(false)} />
      })()}
      {toast}
    </div>
  )
}
