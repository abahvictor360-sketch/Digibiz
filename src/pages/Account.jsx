import { useEffect, useRef, useState } from 'react'
import { Nav, Footer } from '../components/SiteChrome.jsx'
import Icon from '../components/Icon.jsx'
import { GoProButton, PRO_FEATURES, useBilling } from '../components/UpgradeModal.jsx'
import { Link, navigate } from '../router.jsx'
import { confirmCheckout, formatPrice, loginUrl, openBillingPortal, signOut, useAuth } from '../auth.js'
import { cardLink } from '../lib.js'

const fmtDate = (s) => (s ? new Date(s * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function Account() {
  const { user, loading } = useAuth()
  const cfg = useBilling()
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const confirmed = useRef(false)

  useEffect(() => {
    document.title = 'Account | digibiz'
  }, [])
  useEffect(() => {
    if (!loading && !user) navigate(loginUrl('/account'))
  }, [loading, user])

  // Returning from Stripe Checkout.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const sid = p.get('session_id')
    if (!user || confirmed.current || p.get('checkout') !== 'success' || !sid) return
    confirmed.current = true
    confirmCheckout(sid)
      .then((u) => setNotice(u.pro ? 'Welcome to Pro! You can now publish your card.' : 'Payment received. Your plan will update in a moment.'))
      .catch((e) => setNotice(e.message))
      .finally(() => window.history.replaceState({}, '', '/account'))
  }, [user])

  if (!user) return <div className="auth-page" />

  const b = user.billing
  const portal = async () => {
    setBusy(true)
    try {
      await openBillingPortal()
    } catch (e) {
      setNotice(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="landing">
      <Nav />
      <main className="container account-main">
        <h1>Your account</h1>
        {notice && (
          <div className="notice" role="status">
            <Icon name="check" size={18} /> {notice}
          </div>
        )}

        <section className="panel">
          <div className="panel-head">
            <h2>Profile</h2>
          </div>
          <div className="account-row">
            <span className="contact-ic">
              <Icon name="user" size={20} />
            </span>
            <div>
              <b>{user.name || 'No name yet'}</b>
              <small className="muted">{user.email}</small>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => signOut().then(() => navigate('/'))}>
              Sign out
            </button>
          </div>
        </section>

        <section className={`panel plan-panel ${user.pro ? 'is-pro' : ''}`}>
          <div className="panel-head">
            <h2>Plan</h2>
            <span className={`pub-status ${user.pro ? 'on' : 'off'}`}>{user.pro ? 'Pro' : 'Free'}</span>
          </div>
          {user.pro ? (
            <>
              <p className="muted">
                {user.complimentary
                  ? 'You have complimentary Pro access.'
                  : b?.cancelAtPeriodEnd
                    ? `Pro ends on ${fmtDate(b.periodEnd)}. You can resume it before then.`
                    : `Pro renews on ${fmtDate(b?.periodEnd)}.`}
              </p>
              <div className="plan-actions">
                <Link to="/create" className="btn btn-dark">
                  <Icon name="edit" size={18} /> Edit my card
                </Link>
                {user.cardId && (
                  <a className="btn btn-outline" href={cardLink(user.cardId)}>
                    <Icon name="eye" size={18} /> View my card
                  </a>
                )}
                {!user.complimentary && b?.hasAccount && (
                  <button className="btn btn-outline" onClick={portal} disabled={busy}>
                    <Icon name="card" size={18} /> Manage billing
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="muted">
                Your wallet is free forever. Go Pro{cfg ? ` for ${formatPrice(cfg.priceCents, cfg.currency)} a month` : ''} to create and publish your own card.
              </p>
              <ul className="upgrade-list">
                {PRO_FEATURES.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={16} stroke={2.4} /> {f}
                  </li>
                ))}
              </ul>
              <div style={{ maxWidth: 360 }}>
                <GoProButton />
              </div>
              {b?.hasAccount && (
                <button className="link-btn" onClick={portal} disabled={busy}>
                  View past invoices
                </button>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Wallet</h2>
          </div>
          <p className="muted">All the business cards you’ve saved, on every device you sign in to.</p>
          <Link to="/wallet" className="btn btn-lime" style={{ alignSelf: 'flex-start' }}>
            <Icon name="card" size={18} /> Open my wallet
          </Link>
        </section>
      </main>
      <Footer cta={false} />
    </div>
  )
}
