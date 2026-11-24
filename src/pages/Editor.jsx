import { useEffect, useState } from 'react'
import Logo from '../components/Logo.jsx'
import Icon, { SocialBadge } from '../components/Icon.jsx'
import BusinessCard from '../components/BusinessCard.jsx'
import QRModal from '../components/QRModal.jsx'
import { useToast, shareOrCopy } from '../components/Toast.jsx'
import { navigate, Link } from '../router.jsx'
import { usePublish } from '../usePublish.js'
import { useInstall } from '../useInstall.js'
import { EMPTY_CARD, SAMPLE_CARD, SOCIALS, THEMES, cardLink, downloadVCard, loadDraft, resizeImage, saveDraft } from '../lib.js'

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

const sample = () => ({ ...SAMPLE_CARD, socials: { ...SAMPLE_CARD.socials } })

export function PublishStatus({ pub, dirty, busy }) {
  if (busy) return <span className="pub-status busy"><span className="spinner" /> Publishing…</span>
  if (!pub) return <span className="pub-status off">Not published</span>
  if (dirty) return <span className="pub-status warn">Unpublished changes</span>
  return <span className="pub-status on"><Icon name="check" size={14} stroke={2.4} /> Live</span>
}

export default function Editor() {
  const [card, setCard] = useState(() => loadDraft() || sample())
  const [qr, setQr] = useState('')
  const [tab, setTab] = useState('edit')
  const [toast, showToast] = useToast()
  const { pub, link, dirty, busy, error, publish, clearError } = usePublish(card)
  const install = useInstall()

  useEffect(() => {
    const t = setTimeout(() => saveDraft(card), 250)
    return () => clearTimeout(t)
  }, [card])

  useEffect(() => {
    if (error) showToast(error)
    clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  const set = (k) => (e) => setCard((c) => ({ ...c, [k]: e.target.value }))
  const setSocial = (k) => (e) => setCard((c) => ({ ...c, socials: { ...c.socials, [k]: e.target.value } }))

  const onAvatar = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const data = await resizeImage(f)
      setCard((c) => ({ ...c, avatar: data }))
    } catch {
      showToast('Could not read that image')
    }
    e.target.value = ''
  }

  // Every sharing action publishes first, so the link always shows the latest card.
  const withLink = async (fn) => {
    const p = await publish()
    if (p) fn(cardLink(p.id))
  }
  const onPublish = async () => {
    const p = await publish({ force: !dirty })
    if (p) showToast(pub ? 'Changes are live' : 'Your card is live')
  }
  const copy = () =>
    withLink(async (url) => {
      try {
        await navigator.clipboard.writeText(url)
        showToast('Link copied')
      } catch {
        window.prompt('Copy your card link', url)
      }
    })

  return (
    <div className="editor-page">
      <header className="editor-bar">
        <Logo />
        <div className="editor-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'edit'} className={tab === 'edit' ? 'on' : ''} onClick={() => { setTab('edit'); window.scrollTo({ top: 0 }) }}>
            <Icon name="edit" size={16} /> Edit
          </button>
          <button role="tab" aria-selected={tab === 'preview'} className={tab === 'preview' ? 'on' : ''} onClick={() => { setTab('preview'); window.scrollTo({ top: 0 }) }}>
            <Icon name="eye" size={16} /> Preview
          </button>
        </div>
        <div className="editor-bar-actions">
          <span className="hide-sm">
            <PublishStatus pub={pub} dirty={dirty} busy={busy} />
          </span>
          {install && (
            <button className="btn btn-outline btn-sm" onClick={install}>
              <Icon name="download" size={16} /> <span className="hide-xs">Install app</span>
            </button>
          )}
          <button className="btn btn-ghost hide-sm" onClick={() => navigate('/nfc')}>
            <Icon name="nfc" size={18} /> NFC card
          </button>
          <button className="btn btn-lime" onClick={onPublish} disabled={busy}>
            <Icon name="send" size={18} /> <span className="hide-xs">{pub && !dirty ? 'Published' : 'Publish'}</span>
          </button>
        </div>
      </header>

      <main className={`editor-grid show-${tab}`}>
        <section className="editor-form" aria-label="Card details">
          <div className="panel">
            <div className="panel-head">
              <h2>Profile</h2>
              <div className="panel-head-actions">
                <button className="link-btn" onClick={() => setCard(sample())}>Sample</button>
                <button className="link-btn" onClick={() => setCard({ ...EMPTY_CARD, socials: {} })}>Clear</button>
              </div>
            </div>
            <div className="avatar-picker">
              <div className="avatar-preview">
                {card.avatar ? <img src={card.avatar} alt="" /> : <Icon name="user" size={28} />}
              </div>
              <div>
                <label className="btn btn-outline btn-sm">
                  <Icon name="upload" size={16} /> Upload photo
                  <input type="file" accept="image/*" onChange={onAvatar} hidden />
                </label>
                {card.avatar && (
                  <button className="link-btn danger" onClick={() => setCard((c) => ({ ...c, avatar: '' }))}>
                    Remove
                  </button>
                )}
                <p className="field-hint">Square photos work best.</p>
              </div>
            </div>
            <div className="grid-2">
              <Field label="Full name">
                <input value={card.name} onChange={set('name')} placeholder="John Doe" maxLength={60} />
              </Field>
              <Field label="Job title">
                <input value={card.title} onChange={set('title')} placeholder="Founder" maxLength={60} />
              </Field>
            </div>
            <Field label="Company">
              <input value={card.company} onChange={set('company')} placeholder="Northwind Studio" maxLength={60} />
            </Field>
            <Field label="Short bio" hint={`${card.bio.length}/160`}>
              <textarea value={card.bio} onChange={set('bio')} rows={3} maxLength={160} placeholder="What you do, in one line." />
            </Field>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Contact</h2>
            </div>
            <div className="grid-2">
              <Field label="Phone">
                <input type="tel" value={card.phone} onChange={set('phone')} placeholder="+1 416 555 0142" maxLength={40} />
              </Field>
              <Field label="Email">
                <input type="email" value={card.email} onChange={set('email')} placeholder="you@company.com" maxLength={100} />
              </Field>
              <Field label="Website">
                <input value={card.website} onChange={set('website')} placeholder="company.com" maxLength={120} />
              </Field>
              <Field label="Location">
                <input value={card.location} onChange={set('location')} placeholder="City, Country" maxLength={80} />
              </Field>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Social links</h2>
              <span className="pill-count">{SOCIALS.filter((s) => card.socials[s.key]).length} active</span>
            </div>
            <div className="social-inputs">
              {SOCIALS.map((s) => (
                <div className="social-input" key={s.key}>
                  <SocialBadge social={s} size={36} />
                  <input
                    value={card.socials[s.key] || ''}
                    onChange={setSocial(s.key)}
                    placeholder={s.key === 'whatsapp' ? 'Phone number' : `${s.label} username or URL`}
                    aria-label={s.label}
                    maxLength={120}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Theme</h2>
            </div>
            <div className="theme-picker">
              {THEMES.map((t) => (
                <button key={t.key} className={`theme-swatch ${card.theme === t.key ? 'on' : ''}`} onClick={() => setCard((c) => ({ ...c, theme: t.key }))} aria-pressed={card.theme === t.key}>
                  <span className={`swatch-chip theme-${t.key}`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="editor-preview" aria-label="Live preview">
          <div className="preview-sticky">
            <div className="preview-label">
              <span className="dot-live" /> Live preview
              <span className="preview-status">
                <PublishStatus pub={pub} dirty={dirty} busy={busy} />
              </span>
            </div>
            <BusinessCard
              card={card}
              tilt
              onSave={() => downloadVCard(card, link)}
              onShare={() => withLink((url) => shareOrCopy(url, card.name, showToast))}
              onQR={() => withLink(setQr)}
            />
            <div className="preview-actions">
              <button className="btn btn-dark" onClick={() => withLink((url) => navigate(new URL(url).pathname))} disabled={busy}>
                <Icon name="eye" size={18} /> Open card page
              </button>
              <button className="btn btn-outline" onClick={() => withLink(setQr)} disabled={busy}>
                <Icon name="qr" size={18} /> QR code
              </button>
              <Link to="/nfc" className="btn btn-outline">
                <Icon name="nfc" size={18} /> NFC card
              </Link>
            </div>
            <div className="share-box">
              {pub ? (
                <span className="share-url" title={link}>{link.replace(/^https?:\/\//, '')}</span>
              ) : (
                <span className="share-url muted-sans">Publish to get your permanent link</span>
              )}
              <button className="btn btn-lime btn-sm" onClick={copy} disabled={busy}>
                <Icon name="copy" size={16} /> Copy
              </button>
            </div>
            <p className="field-hint center">
              Your link never changes — edit and press Publish, and everyone with your link, QR code or NFC card sees the update. Only this browser can edit this card.
            </p>
          </div>
        </aside>
      </main>
      {qr && <QRModal url={qr} name={card.name} onClose={() => setQr('')} />}
      {toast}
    </div>
  )
}
