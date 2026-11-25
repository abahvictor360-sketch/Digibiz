import { useEffect, useMemo, useRef, useState } from 'react'
import BusinessCard from '../components/BusinessCard.jsx'
import QRModal from '../components/QRModal.jsx'
import Icon from '../components/Icon.jsx'
import { useToast, shareOrCopy } from '../components/Toast.jsx'
import { Link, navigate, useLocation } from '../router.jsx'
import { loginUrl, useAuth } from '../auth.js'
import { saveCardId } from '../wallet.js'
import { decodeCard, downloadVCard, fetchCard } from '../lib.js'

function Missing({ title, text }) {
  return (
    <div className="card-page theme-bg-glass">
      <div className="card-missing">
        <div className="missing-icon">
          <Icon name="link" size={28} />
        </div>
        <h1>{title}</h1>
        <p className="muted">{text}</p>
        <Link to="/create" className="btn btn-dark">
          Create your card <Icon name="arrow" size={18} />
        </Link>
      </div>
    </div>
  )
}

export default function CardView() {
  const { path, hash } = useLocation()
  const id = path.startsWith('/c/') ? path.slice(3).split('/')[0] : ''
  // Older links carry the whole card in the #hash.
  const legacy = useMemo(() => (!id && hash.length > 1 ? decodeCard(hash.slice(1)) : null), [id, hash])
  const [state, setState] = useState({ status: id ? 'loading' : 'done', card: null })
  const [qr, setQr] = useState(false)
  const [toast, showToast] = useToast()
  const { user, loading: authLoading } = useAuth()
  const [saved, setSaved] = useState('')
  const autoSaved = useRef(false)

  const saveToWallet = async () => {
    if (!user) return navigate(loginUrl(`/c/${id}?save=1`))
    setSaved('saving')
    try {
      const res = await saveCardId(id)
      setSaved('saved')
      showToast(res.duplicate ? 'Already in your wallet' : 'Saved to your wallet')
    } catch (e) {
      setSaved('')
      showToast(e.message)
    }
  }

  // Coming back from sign-in with ?save=1: save automatically.
  useEffect(() => {
    if (!id || authLoading || !user || autoSaved.current) return
    if (new URLSearchParams(window.location.search).get('save') !== '1') return
    autoSaved.current = true
    window.history.replaceState({}, '', `/c/${id}`)
    saveToWallet()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, user])

  useEffect(() => {
    if (!id) return
    let alive = true
    setState({ status: 'loading', card: null })
    fetchCard(id)
      .then((card) => alive && setState({ status: 'done', card }))
      .catch((e) => alive && setState({ status: e.status === 404 ? 'missing' : 'error', card: null }))
    return () => {
      alive = false
    }
  }, [id])

  const card = id ? state.card : legacy
  const url = id ? `${window.location.origin}/c/${id}` : window.location.href

  useEffect(() => {
    document.title = card?.name ? `${card.name} | digibiz card` : 'digibiz card'
    return () => {
      document.title = 'digibiz | Smart Digital Business Cards'
    }
  }, [card])

  if (id && state.status === 'loading') {
    return (
      <div className="card-page theme-bg-glass">
        <div className="card-page-inner">
          <div className="bc-skeleton" aria-label="Loading card" />
        </div>
      </div>
    )
  }
  if (id && state.status === 'missing') return <Missing title="Card not found" text="This card may have been removed, or the link has a typo." />
  if (id && state.status === 'error') return <Missing title="Couldn’t load this card" text="Check your connection and refresh the page." />
  if (!card) return <Missing title="This card link looks incomplete" text="Ask the sender to share their link again, or make a card of your own." />

  return (
    <div className={`card-page theme-bg-${card.theme}`}>
      <div className="card-page-inner">
        <BusinessCard card={card} tilt onSave={() => downloadVCard(card, url)} onShare={() => shareOrCopy(url, card.name, showToast)} onQR={() => setQr(true)} />
        {id && user?.cardId !== id && (
          <button className="btn btn-lime btn-lg save-wallet" onClick={saveToWallet} disabled={saved === 'saving' || saved === 'saved'}>
            {saved === 'saving' ? <span className="spinner" /> : <Icon name={saved === 'saved' ? 'check' : 'plus'} size={18} />}
            {saved === 'saved' ? 'In your wallet' : 'Save to my wallet'}
          </button>
        )}
        <Link to="/create" className="made-with">
          <span className="logo-mark small">
            <span />
          </span>
          Get your own card with <strong>digibiz</strong>
          <Icon name="arrow" size={16} />
        </Link>
      </div>
      {qr && <QRModal url={url} name={card.name} onClose={() => setQr(false)} />}
      {toast}
    </div>
  )
}
