import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { Link } from '../router.jsx'
import { formatPrice, getBillingConfig, loginUrl, startCheckout } from '../auth.js'

export const PRO_FEATURES = ['Publish your own digital card', 'Permanent link + QR code', 'Write it to NFC cards', 'Print-ready card designs', 'Update anytime, links never change']

export function useBilling() {
  const [cfg, setCfg] = useState(null)
  useEffect(() => {
    getBillingConfig().then(setCfg)
  }, [])
  return cfg
}

export function GoProButton({ className = 'btn btn-lime btn-block', label }) {
  const cfg = useBilling()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const price = cfg ? formatPrice(cfg.priceCents, cfg.currency) : ''
  const go = async () => {
    setBusy(true)
    setErr('')
    try {
      await startCheckout()
    } catch (e) {
      if (e.status === 401) window.location.href = loginUrl('/pricing')
      else setErr(e.message)
      setBusy(false)
    }
  }
  return (
    <>
      <button className={className} onClick={go} disabled={busy || (cfg && !cfg.ready)}>
        {busy ? <span className="spinner" /> : <Icon name="sparkle" size={16} />} {label || `Go Pro${price ? `, ${price}/month` : ''}`}
      </button>
      {cfg && !cfg.ready && <p className="field-hint center">Payments are being set up. Pro will be available very soon.</p>}
      {err && <p className="form-error">{err}</p>}
    </>
  )
}

export default function UpgradeModal({ need, onClose }) {
  const cfg = useBilling()
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!need) return null
  const next = window.location.pathname + window.location.search

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
        <span className="upgrade-badge">
          <Icon name={need === 'login' ? 'user' : 'sparkle'} size={22} />
        </span>
        {need === 'login' ? (
          <>
            <h3 id="upgrade-title">Sign in to publish</h3>
            <p className="muted">Create a free account to save business cards, then go Pro to publish your own.</p>
            <div className="upgrade-actions">
              <Link to={loginUrl(next)} className="btn btn-dark btn-block">
                Sign in
              </Link>
              <Link to={`${loginUrl(next)}&mode=signup`} className="btn btn-outline btn-block">
                Create free account
              </Link>
            </div>
          </>
        ) : (
          <>
            <h3 id="upgrade-title">Go Pro to publish</h3>
            <p className="muted">
              {cfg ? `${formatPrice(cfg.priceCents, cfg.currency)} a month. ` : ''}Cancel anytime. Saving other people’s cards stays free.
            </p>
            <ul className="upgrade-list">
              {PRO_FEATURES.map((f) => (
                <li key={f}>
                  <Icon name="check" size={16} stroke={2.4} /> {f}
                </li>
              ))}
            </ul>
            <GoProButton />
          </>
        )}
      </div>
    </div>
  )
}
