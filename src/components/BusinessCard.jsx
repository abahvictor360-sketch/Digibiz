import { useRef } from 'react'
import Icon, { SocialBadge } from './Icon.jsx'
import { SOCIALS, initials, websiteUrl } from '../lib.js'

export function Avatar({ card, size = 88 }) {
  return (
    <div className="bc-avatar" style={{ width: size, height: size }}>
      <div className="bc-avatar-inner">
        {card.avatar ? <img src={card.avatar} alt="" /> : <span style={{ fontSize: size * 0.34 }}>{initials(card.name)}</span>}
      </div>
    </div>
  )
}

export default function BusinessCard({ card, tilt = false, onSave, onShare, onQR, hideActions = false }) {
  const ref = useRef(null)
  const socials = SOCIALS.filter((s) => card.socials?.[s.key])

  const handleMove = (e) => {
    if (!tilt || !ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`)
    ref.current.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`)
    ref.current.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`)
    ref.current.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`)
  }
  const reset = () => {
    if (!ref.current) return
    ref.current.style.setProperty('--rx', '0deg')
    ref.current.style.setProperty('--ry', '0deg')
  }

  const rows = [
    card.phone && { icon: 'phone', label: card.phone, href: `tel:${card.phone.replace(/\s+/g, '')}` },
    card.email && { icon: 'mail', label: card.email, href: `mailto:${card.email}` },
    card.website && { icon: 'globe', label: card.website.replace(/^https?:\/\//, ''), href: websiteUrl(card.website) },
    card.location && { icon: 'pin', label: card.location, href: `https://maps.google.com/?q=${encodeURIComponent(card.location)}` },
  ].filter(Boolean)

  return (
    <div className={`bc theme-${card.theme || 'glass'} ${tilt ? 'bc-tilt' : ''}`} ref={ref} onMouseMove={handleMove} onMouseLeave={reset}>
      <div className="bc-shine" />
      <div className="bc-top">
        <Avatar card={card} />
        <div className="bc-id">
          <h3 className="bc-name">{card.name || 'Your Name'}</h3>
          <p className="bc-role">
            {[card.title, card.company].filter(Boolean).join(' · ') || 'Title · Company'}
          </p>
        </div>
      </div>

      {card.bio && <p className="bc-bio">{card.bio}</p>}

      {rows.length > 0 && (
        <ul className="bc-rows">
          {rows.map((r) => (
            <li key={r.icon}>
              <a href={r.href} target={r.icon === 'globe' || r.icon === 'pin' ? '_blank' : undefined} rel="noreferrer">
                <span className="bc-row-icon">
                  <Icon name={r.icon} size={16} />
                </span>
                <span className="bc-row-text">{r.label}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {socials.length > 0 && (
        <div className="bc-socials">
          {socials.map((s) => (
            <a key={s.key} href={s.url(card.socials[s.key])} target="_blank" rel="noreferrer" title={s.label} aria-label={s.label}>
              <SocialBadge social={s} size={34} />
            </a>
          ))}
        </div>
      )}

      {!hideActions && (
      <div className="bc-actions">
        <button type="button" className="bc-btn bc-btn-primary" onClick={onSave}>
          <Icon name="download" size={16} /> Save contact
        </button>
        <button type="button" className="bc-btn" onClick={onShare}>
          <Icon name="share" size={16} /> Share
        </button>
        <button type="button" className="bc-btn bc-btn-icon" onClick={onQR} aria-label="Show QR code">
          <Icon name="qr" size={18} />
        </button>
      </div>
      )}
    </div>
  )
}
