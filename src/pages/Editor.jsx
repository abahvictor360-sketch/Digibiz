import { useEffect, useMemo, useState } from 'react'
import Logo from '../components/Logo.jsx'
import Icon, { SocialBadge } from '../components/Icon.jsx'
import BusinessCard from '../components/BusinessCard.jsx'
import QRModal from '../components/QRModal.jsx'
import { useToast, shareOrCopy } from '../components/Toast.jsx'
import { navigate } from '../router.jsx'
import { qrUrl, EMPTY_CARD, SAMPLE_CARD, SOCIALS, THEMES, downloadVCard, loadDraft, resizeImage, saveDraft, shareUrl } from '../lib.js'

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export default function Editor() {
  const [card, setCard] = useState(() => loadDraft() || { ...SAMPLE_CARD, socials: { ...SAMPLE_CARD.socials } })
  const [qr, setQr] = useState(false)
  const [tab, setTab] = useState('edit')
  const [toast, showToast] = useToast()

  useEffect(() => {
    const t = setTimeout(() => saveDraft(card), 250)
    return () => clearTimeout(t)
  }, [card])

  const url = useMemo(() => shareUrl(card), [card])
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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Share link copied')
    } catch {
      window.prompt('Copy your card link', url)
    }
  }

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
          <button className="btn btn-ghost hide-sm" onClick={() => setQr(true)}>
            <Icon name="qr" size={18} /> QR
          </button>
          <button className="btn btn-lime" onClick={copy}>
            <Icon name="link" size={18} /> <span className="hide-xs">Copy link</span>
          </button>
        </div>
      </header>

      <main className={`editor-grid show-${tab}`}>
        <section className="editor-form" aria-label="Card details">
          <div className="panel">
            <div className="panel-head">
              <h2>Profile</h2>
              <div className="panel-head-actions">
                <button className="link-btn" onClick={() => setCard({ ...SAMPLE_CARD, socials: { ...SAMPLE_CARD.socials } })}>Sample</button>
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
                <p className="field-hint">Square photos work best. Resized to keep your link short.</p>
              </div>
            </div>
            <div className="grid-2">
              <Field label="Full name">
                <input value={card.name} onChange={set('name')} placeholder="Amara Okafor" maxLength={60} />
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
                <input type="tel" value={card.phone} onChange={set('phone')} placeholder="+234 801 234 5678" />
              </Field>
              <Field label="Email">
                <input type="email" value={card.email} onChange={set('email')} placeholder="you@company.com" />
              </Field>
              <Field label="Website">
                <input value={card.website} onChange={set('website')} placeholder="company.com" />
              </Field>
              <Field label="Location">
                <input value={card.location} onChange={set('location')} placeholder="City, Country" />
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
            </div>
            <BusinessCard
              card={card}
              tilt
              onSave={() => downloadVCard(card, url)}
              onShare={() => shareOrCopy(url, card.name, showToast)}
              onQR={() => setQr(true)}
            />
            <div className="preview-actions">
              <button className="btn btn-dark" onClick={() => navigate(new URL(url).pathname + new URL(url).hash)}>
                <Icon name="eye" size={18} /> Open card page
              </button>
              <button className="btn btn-outline" onClick={() => setQr(true)}>
                <Icon name="qr" size={18} /> QR code
              </button>
              <button className="btn btn-outline" onClick={() => downloadVCard(card, url)}>
                <Icon name="download" size={18} /> vCard
              </button>
            </div>
            <div className="share-box">
              <span className="share-url" title={url}>{url}</span>
              <button className="btn btn-lime btn-sm" onClick={copy}>
                <Icon name="copy" size={16} /> Copy
              </button>
            </div>
            <p className="field-hint center">Your card lives entirely in this link — no account, nothing stored on a server. Drafts are saved in this browser.</p>
          </div>
        </aside>
      </main>
      {qr && (() => {
        const q = qrUrl(card)
        return <QRModal url={q.url} name={card.name} note={q.photoDropped ? 'Your photo is left out of the QR version to keep the code scannable. The share link includes it.' : ''} onClose={() => setQr(false)} />
      })()}
      {toast}
    </div>
  )
}
