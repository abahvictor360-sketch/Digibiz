import { useEffect, useState } from 'react'
import DashShell, { fmtDate } from '../components/DashShell.jsx'
import Icon from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'
import { Link, navigate } from '../router.jsx'
import { useAuth, refreshProfile } from '../auth.js'
import { callFunction } from '../supabase.js'
import { PRO_FEATURES, FREE_FEATURES, PRICE } from '../config.js'

const STATUS = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Payment failed, retrying',
  canceled: 'Cancelled',
  unpaid: 'Unpaid',
  incomplete: 'Not completed',
  incomplete_expired: 'Expired',
  paused: 'Paused',
}

export default function Billing() {
  const { user, profile, subscription, isPro } = useAuth()
  const [period, setPeriod] = useState('month')
  const [busy, setBusy] = useState('')
  const [toast, showToast] = useToast()
  const q = new URLSearchParams(window.location.search)
  const next = q.get('next')
  const checkout = q.get('checkout')

  // Stripe confirms the payment through a webhook a moment after returning here.
  useEffect(() => {
    if (checkout !== 'success' || isPro) return
    let n = 0
    const t = setInterval(() => {
      n += 1
      refreshProfile()
      if (n >= 10) clearInterval(t)
    }, 2000)
    return () => clearInterval(t)
  }, [checkout, isPro])

  useEffect(() => {
    if (checkout === 'cancelled') showToast('Checkout cancelled. You weren’t charged.')
  }, [checkout, showToast])

  const subscribe = async () => {
    setBusy('checkout')
    try {
      const { url } = await callFunction('stripe-checkout', { interval: period, returnTo: next ? `/billing?next=${encodeURIComponent(next)}` : '/billing' })
      window.location.href = url
    } catch (e) {
      showToast(e.message)
      setBusy('')
    }
  }
  const manage = async () => {
    setBusy('portal')
    try {
      const { url } = await callFunction('stripe-portal', {})
      window.location.href = url
    } catch (e) {
      showToast(e.message)
      setBusy('')
    }
  }

  const paidSub = subscription && subscription.status !== 'incomplete'
  const via = profile?.role === 'admin' ? 'admin' : profile?.comped ? 'comped' : paidSub ? 'stripe' : null

  return (
    <DashShell title="Plan & billing">
      {user && (
        <>
          {checkout === 'success' && (
            <div className={`notice ${isPro ? 'ok' : ''}`}>
              <Icon name={isPro ? 'check' : 'bolt'} size={18} />
              {isPro ? 'Payment received. Welcome to digibiz Pro!' : 'Payment received. Activating your plan…'}
              {isPro && next && (
                <button className="btn btn-dark btn-sm" onClick={() => navigate(next)}>
                  Continue <Icon name="arrow" size={16} />
                </button>
              )}
            </div>
          )}

          {isPro ? (
            <div className="panel plan-current">
              <div className="panel-head">
                <h2>digibiz Pro</h2>
                <span className="role-badge admin">Active</span>
              </div>
              {via === 'stripe' && (
                <p className="muted">
                  {STATUS[subscription.status] || subscription.status} · ${subscription.interval === 'year' ? `${PRICE.year * 12}/year` : `${PRICE.month}/month`} ·{' '}
                  {subscription.cancel_at_period_end ? 'Ends' : 'Renews'} {fmtDate(subscription.current_period_end)}
                </p>
              )}
              {via === 'comped' && <p className="muted">Pro was given to your account by the digibiz team.</p>}
              {via === 'admin' && <p className="muted">Admins have Pro included.</p>}
              {subscription?.status === 'past_due' && (
                <p className="form-error">Your last payment failed. Update your card so your cards stay online.</p>
              )}
              <ul className="plan-feats">
                {PRO_FEATURES.map((f) => (
                  <li key={f}><Icon name="check" size={16} stroke={2.4} /> {f}</li>
                ))}
              </ul>
              <div className="row-gap">
                {via === 'stripe' && (
                  <button className="btn btn-dark" onClick={manage} disabled={busy === 'portal'}>
                    <Icon name="settings" size={16} /> Manage billing
                  </button>
                )}
                <Link to={next || '/dashboard'} className="btn btn-outline">
                  {next ? 'Continue' : 'Go to my cards'} <Icon name="arrow" size={16} />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {next && (
                <div className="notice">
                  <Icon name="send" size={18} /> Publishing a card needs digibiz Pro. Your design is saved, so you can publish as soon as you upgrade.
                </div>
              )}
              {paidSub && ['canceled', 'unpaid', 'incomplete_expired', 'paused'].includes(subscription.status) && (
                <div className="notice warn">
                  <Icon name="bolt" size={18} /> Your Pro plan ended, so your cards are offline. Resubscribe to bring them back. Nothing was deleted.
                </div>
              )}
              <div className="plan-grid">
                <div className="panel plan-card">
                  <h2>Free</h2>
                  <p className="plan-price">$0</p>
                  <p className="muted small">Your current plan</p>
                  <ul className="plan-feats">
                    {FREE_FEATURES.map((f) => (
                      <li key={f}><Icon name="check" size={16} stroke={2.4} /> {f}</li>
                    ))}
                  </ul>
                  <Link to="/wallet" className="btn btn-outline btn-block">Open my wallet</Link>
                </div>
                <div className="panel plan-card hot">
                  <div className="panel-head">
                    <h2>Pro</h2>
                    <div className="seg-tabs small-tabs" role="radiogroup" aria-label="Billing period">
                      {['month', 'year'].map((i) => (
                        <button key={i} role="radio" aria-checked={period === i} className={period === i ? 'on' : ''} onClick={() => setPeriod(i)}>
                          {i === 'month' ? 'Monthly' : 'Yearly'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="plan-price">
                    ${PRICE[period]}
                    <small>/month</small>
                  </p>
                  <p className="muted small">{period === 'year' ? `Billed $${PRICE.year * 12} yearly. Save $${(PRICE.month - PRICE.year) * 12}.` : 'Billed monthly. Cancel any time.'}</p>
                  <ul className="plan-feats">
                    {PRO_FEATURES.map((f) => (
                      <li key={f}><Icon name="check" size={16} stroke={2.4} /> {f}</li>
                    ))}
                  </ul>
                  <button className="btn btn-lime btn-lg btn-block" onClick={subscribe} disabled={busy === 'checkout'}>
                    {busy === 'checkout' ? <span className="spinner" /> : <Icon name="bolt" size={18} />} Upgrade to Pro
                  </button>
                  <p className="muted small center">Secure payment by Stripe.</p>
                </div>
              </div>
              {paidSub && (
                <button className="link-btn" onClick={manage} disabled={busy === 'portal'}>
                  View past invoices
                </button>
              )}
            </>
          )}
        </>
      )}
      {toast}
    </DashShell>
  )
}
