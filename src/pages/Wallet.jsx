import { useCallback, useEffect, useMemo, useState } from 'react'
import { Nav, Footer } from '../components/SiteChrome.jsx'
import Icon from '../components/Icon.jsx'
import BusinessCard, { Avatar } from '../components/BusinessCard.jsx'
import { QRScanner, cardIdFrom, parseVCard, useNfcRead } from '../components/Scanner.jsx'
import { useToast } from '../components/Toast.jsx'
import { Link } from '../router.jsx'
import { loginUrl, useAuth } from '../auth.js'
import { EMPTY_CARD, cardLink, downloadVCard } from '../lib.js'
import { listWallet, photoUrl, removeItem, saveCardId, saveManual, shrinkPhoto, updateItem } from '../wallet.js'

const FIELDS = [
  ['name', 'Full name', 'Jane Smith'],
  ['title', 'Job title', 'Sales Director'],
  ['company', 'Company', 'Acme Inc.'],
  ['phone', 'Phone', '+1 416 555 0199'],
  ['email', 'Email', 'jane@acme.com'],
  ['website', 'Website', 'acme.com'],
  ['location', 'Location', 'Toronto, Canada'],
]

const tagsFrom = (s) => s.split(',').map((t) => t.trim()).filter(Boolean)

function ManualForm({ initial, initialPhoto, onSubmit, busy, submitLabel = 'Save to wallet' }) {
  const [card, setCard] = useState({ ...EMPTY_CARD, theme: 'mono', ...initial })
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [photo, setPhoto] = useState(initialPhoto || '')
  const [err, setErr] = useState('')
  const set = (k) => (e) => setCard((c) => ({ ...c, [k]: e.target.value }))

  const pick = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setPhoto(await shrinkPhoto(f))
    } catch {
      setErr('Couldn’t read that photo')
    }
  }
  const submit = (e) => {
    e.preventDefault()
    if (!card.name.trim() && !card.company.trim()) return setErr('Add at least a name or a company')
    onSubmit({ card, notes, tags: tagsFrom(tags), photo })
  }

  return (
    <form className="manual-form" onSubmit={submit}>
      <label className={`photo-drop ${photo ? 'has' : ''}`}>
        {photo ? <img src={photo} alt="Paper card" /> : (
          <span>
            <Icon name="upload" size={22} />
            <b>Add a photo of the card</b>
            <small>Optional. Keeps the original design.</small>
          </span>
        )}
        <input type="file" accept="image/*" capture="environment" onChange={pick} hidden />
      </label>
      {photo && (
        <button type="button" className="link-btn danger" onClick={() => setPhoto('')}>
          Remove photo
        </button>
      )}
      <div className="grid-2">
        {FIELDS.map(([k, label, ph]) => (
          <label className="field" key={k}>
            <span className="field-label">{label}</span>
            <input value={card[k]} onChange={set(k)} placeholder={ph} maxLength={k === 'website' ? 120 : 100} />
          </label>
        ))}
        <label className="field">
          <span className="field-label">Tags</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="client, expo 2026" />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Notes</span>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Where you met, what to follow up on…" maxLength={1000} />
      </label>
      {err && <p className="form-error">{err}</p>}
      <button className="btn btn-dark btn-lg" disabled={busy}>
        {busy ? <span className="spinner" /> : <Icon name="check" size={18} />} {submitLabel}
      </button>
    </form>
  )
}

function AddModal({ onClose, onAdded }) {
  const [step, setStep] = useState('menu')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [prefill, setPrefill] = useState(null)
  const [link, setLink] = useState('')
  const nfc = useNfcRead()

  const handleText = useCallback(
    async (text) => {
      setErr('')
      const id = cardIdFrom(text)
      if (id) {
        setStep('saving')
        try {
          const res = await saveCardId(id)
          onAdded(res.item, res.duplicate)
        } catch (e) {
          setErr(e.message)
          setStep('menu')
        }
        return
      }
      const vc = parseVCard(text)
      if (vc) {
        setPrefill(vc)
        setStep('manual')
        return
      }
      setErr('That code isn’t a business card. Try another code, or type the details in.')
      setStep('menu')
    },
    [onAdded]
  )

  useEffect(() => {
    if (step !== 'nfc') return
    return nfc.read(handleText, (m) => {
      setErr(m)
      setStep('menu')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const saveManualCard = async ({ card, notes, tags, photo }) => {
    setBusy(true)
    setErr('')
    try {
      onAdded(await saveManual(card, { notes, tags, photo: photo || undefined }))
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal sheet ${step === 'manual' ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="add-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
        {step !== 'menu' && step !== 'saving' && (
          <button className="modal-back" onClick={() => { setStep('menu'); setErr('') }} aria-label="Back">
            <Icon name="arrowLeft" />
          </button>
        )}
        <h3 id="add-title">
          {{ menu: 'Add a business card', scan: 'Scan a QR code', nfc: 'Tap an NFC card', manual: 'Add card details', link: 'Paste a card link', saving: 'Saving…' }[step]}
        </h3>
        {err && <p className="form-error">{err}</p>}

        {step === 'menu' && (
          <div className="add-options">
            <button onClick={() => setStep('scan')}>
              <span className="contact-ic"><Icon name="qr" size={20} /></span>
              <span><b>Scan QR code</b><small>From a digibiz card or any vCard QR</small></span>
            </button>
            {nfc.supported && (
              <button onClick={() => setStep('nfc')}>
                <span className="contact-ic"><Icon name="nfc" size={20} /></span>
                <span><b>Tap NFC card</b><small>Hold a digibiz NFC card to your phone</small></span>
              </button>
            )}
            <button onClick={() => { setPrefill(null); setStep('manual') }}>
              <span className="contact-ic"><Icon name="edit" size={20} /></span>
              <span><b>Paper card</b><small>Type the details and snap a photo</small></span>
            </button>
            <button onClick={() => setStep('link')}>
              <span className="contact-ic"><Icon name="link" size={20} /></span>
              <span><b>Paste a link</b><small>Someone sent you their digibiz link</small></span>
            </button>
          </div>
        )}

        {step === 'scan' && <QRScanner onResult={handleText} />}

        {step === 'nfc' && (
          <div className="nfc-writer">
            <div className="nfc-pulse active">
              <span className="nfc-pulse-ring" />
              <span className="nfc-pulse-ring r2" />
              <span className="nfc-pulse-core"><Icon name="nfc" size={34} stroke={2.2} /></span>
            </div>
            <p className="nfc-msg">Hold the NFC card against the back of your phone…</p>
          </div>
        )}

        {step === 'link' && (
          <form className="link-form" onSubmit={(e) => { e.preventDefault(); handleText(link) }}>
            <input autoFocus value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…/c/ab12cd34" aria-label="Card link" />
            <button className="btn btn-dark" disabled={!link.trim()}>Save card</button>
          </form>
        )}

        {step === 'manual' && <ManualForm initial={prefill || {}} onSubmit={saveManualCard} busy={busy} />}

        {step === 'saving' && (
          <div className="center" style={{ padding: 30 }}>
            <span className="spinner big" />
          </div>
        )}
      </div>
    </div>
  )
}

function Detail({ item, onClose, onChange, onRemove, toast }) {
  const [notes, setNotes] = useState(item.notes || '')
  const [tags, setTags] = useState((item.tags || []).join(', '))
  const [busy, setBusy] = useState(false)
  const card = item.card
  const changed = notes !== (item.notes || '') || tags !== (item.tags || []).join(', ')

  const save = async () => {
    setBusy(true)
    try {
      onChange(await updateItem(item.id, { notes, tags: tagsFrom(tags) }))
      toast('Saved')
    } catch (e) {
      toast(e.message)
    } finally {
      setBusy(false)
    }
  }
  const fav = async () => onChange(await updateItem(item.id, { favorite: !item.favorite }))
  const del = async () => {
    if (!window.confirm(`Remove ${card.name || card.company} from your wallet?`)) return
    await removeItem(item.id)
    onRemove(item.id)
  }
  const tel = card.phone && `tel:${card.phone.replace(/\s+/g, '')}`

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal sheet wide detail" role="dialog" aria-modal="true" aria-label={card.name || card.company} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
        <div className="detail-badges">
          {item.cardId ? <span className="pub-status on"><Icon name="check" size={12} stroke={2.6} /> digibiz card, always up to date</span> : <span className="pub-status off">Paper card</span>}
          {item.removed && <span className="pub-status warn">The owner removed this card</span>}
        </div>
        {item.hasPhoto && <img className="paper-photo" src={photoUrl(item.id)} alt="Photo of the paper card" />}
        <BusinessCard card={{ ...card, theme: item.cardId ? card.theme : 'mono' }} hideActions />
        <div className="detail-actions">
          {tel && <a className="btn btn-dark" href={tel}><Icon name="phone" size={18} /> Call</a>}
          {card.email && <a className="btn btn-outline" href={`mailto:${card.email}`}><Icon name="mail" size={18} /> Email</a>}
          <button className="btn btn-outline" onClick={() => downloadVCard(card, item.cardId ? cardLink(item.cardId) : '')}>
            <Icon name="download" size={18} /> Save to phone
          </button>
          {item.cardId && <a className="btn btn-outline" href={cardLink(item.cardId)}><Icon name="eye" size={18} /> Open card</a>}
        </div>
        <div className="detail-notes">
          <label className="field">
            <span className="field-label">Notes</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Where you met, what to follow up on…" maxLength={1000} />
          </label>
          <label className="field">
            <span className="field-label">Tags</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="client, expo 2026" />
          </label>
          <div className="detail-foot">
            <button className="btn btn-lime" onClick={save} disabled={!changed || busy}>
              {busy ? <span className="spinner" /> : <Icon name="check" size={18} />} Save notes
            </button>
            <button className={`btn btn-ghost ${item.favorite ? 'fav-on' : ''}`} onClick={fav} aria-pressed={item.favorite}>
              <Icon name="star" size={18} /> {item.favorite ? 'Favourite' : 'Add to favourites'}
            </button>
            <button className="btn btn-ghost danger-text" onClick={del}>
              <Icon name="trash" size={18} /> Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SignedOut() {
  return (
    <section className="page-hero">
      <div className="hero-glow" />
      <div className="container page-hero-inner">
        <span className="eyebrow"><span className="eyebrow-dot" /> Free forever</span>
        <h1>Every card you collect, <span className="ul">in one place</span></h1>
        <p className="lead">Scan QR codes, tap NFC cards or snap paper cards. Search them anytime, add notes, and save anyone to your phone in one tap.</p>
        <div className="hero-ctas">
          <Link to={`${loginUrl('/wallet')}&mode=signup`} className="btn btn-dark btn-lg">Create free wallet</Link>
          <Link to={loginUrl('/wallet')} className="btn btn-ghost btn-lg">Sign in</Link>
        </div>
      </div>
    </section>
  )
}

export default function Wallet() {
  const { user, loading } = useAuth()
  const [items, setItems] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState(null)
  const [toast, showToast] = useToast()

  useEffect(() => {
    document.title = 'Wallet | digibiz'
  }, [])
  useEffect(() => {
    if (!user) return
    listWallet().then(setItems).catch((e) => setLoadErr(e.message))
  }, [user])

  const allTags = useMemo(() => [...new Set((items || []).flatMap((i) => i.tags || []))].sort(), [items])
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (items || []).filter((i) => {
      if (filter === 'fav' && !i.favorite) return false
      if (filter.startsWith('tag:') && !(i.tags || []).includes(filter.slice(4))) return false
      if (!needle) return true
      const c = i.card || {}
      return [c.name, c.title, c.company, c.email, c.phone, c.location, i.notes, ...(i.tags || [])].join(' ').toLowerCase().includes(needle)
    })
  }, [items, q, filter])

  const upsert = (item) => setItems((list) => [item, ...(list || []).filter((x) => x.id !== item.id)])
  const replace = (item) => {
    setItems((list) => list.map((x) => (x.id === item.id ? item : x)))
    setOpen(item)
  }

  return (
    <div className="landing">
      <Nav />
      {loading ? null : !user ? (
        <SignedOut />
      ) : (
        <main className="container wallet-main">
          <div className="wallet-head">
            <div>
              <h1>Wallet</h1>
              <p className="muted">{items ? `${items.length} ${items.length === 1 ? 'card' : 'cards'} saved` : 'Loading…'}</p>
            </div>
            <button className="btn btn-dark btn-lg" onClick={() => setAdding(true)}>
              <Icon name="plus" size={18} /> Add card
            </button>
          </div>

          {items && items.length > 0 && (
            <div className="wallet-tools">
              <label className="search">
                <Icon name="search" size={18} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names, companies, notes…" aria-label="Search wallet" />
              </label>
              <div className="chips" role="tablist">
                {[['all', 'All'], ['fav', 'Favourites'], ...allTags.map((t) => [`tag:${t}`, `#${t}`])].map(([k, label]) => (
                  <button key={k} role="tab" aria-selected={filter === k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadErr && <p className="form-error">{loadErr}</p>}

          {items && items.length === 0 && (
            <div className="wallet-empty">
              <span className="missing-icon"><Icon name="card" size={28} /></span>
              <h2>Your wallet is empty</h2>
              <p className="muted">Scan a QR code, tap an NFC card, or add a paper card. They’re saved to your account on every device.</p>
              <button className="btn btn-lime btn-lg" onClick={() => setAdding(true)}>
                <Icon name="plus" size={18} /> Add your first card
              </button>
            </div>
          )}

          {items && items.length > 0 && shown.length === 0 && <p className="muted center" style={{ padding: 40 }}>No cards match.</p>}

          <div className="wallet-grid">
            {shown.map((it) => {
              const c = it.card || {}
              return (
                <button key={it.id} className="wallet-tile" onClick={() => setOpen(it)}>
                  {it.hasPhoto ? <img className="tile-photo" src={photoUrl(it.id)} alt="" loading="lazy" /> : <Avatar card={c} size={52} />}
                  <span className="tile-text">
                    <b>{c.name || c.company}</b>
                    <small>{[c.title, c.name ? c.company : ''].filter(Boolean).join(' · ') || c.email || c.phone || ' '}</small>
                    {(it.tags || []).length > 0 && <span className="tile-tags">{it.tags.slice(0, 3).map((t) => <i key={t}>#{t}</i>)}</span>}
                  </span>
                  <span className="tile-meta">
                    {it.favorite && <Icon name="star" size={16} className="fav-icon" />}
                    {it.cardId && <span className="tile-live" title="digibiz card">live</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </main>
      )}
      {adding && (
        <AddModal
          onClose={() => setAdding(false)}
          onAdded={(item, dup) => {
            upsert(item)
            setAdding(false)
            showToast(dup ? 'Already in your wallet' : 'Saved to your wallet')
          }}
        />
      )}
      {open && (
        <Detail
          key={open.id + open.updatedAt}
          item={open}
          onClose={() => setOpen(null)}
          onChange={replace}
          onRemove={(id) => {
            setItems((list) => list.filter((x) => x.id !== id))
            setOpen(null)
            showToast('Removed')
          }}
          toast={showToast}
        />
      )}
      {toast}
      <Footer cta={false} />
    </div>
  )
}
