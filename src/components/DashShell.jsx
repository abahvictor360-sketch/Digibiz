import { useEffect } from 'react'
import Logo from './Logo.jsx'
import Icon from './Icon.jsx'
import { Link, navigate, useLocation } from '../router.jsx'
import { signOut, useAuth } from '../auth.js'
import { initials } from '../lib.js'

// Layout + guard for signed-in pages. Redirects to /login when signed out.
export default function DashShell({ title, admin = false, actions, children }) {
  const auth = useAuth()
  const { path } = useLocation()

  useEffect(() => {
    if (!auth.loading && !auth.user) navigate(`/login?next=${encodeURIComponent(path + window.location.search)}`)
  }, [auth.loading, auth.user, path])

  useEffect(() => {
    document.title = `${title} | digibiz`
    return () => (document.title = 'digibiz | Smart Digital Business Cards')
  }, [title])

  const isAdmin = auth.profile?.role === 'admin'
  const name = auth.profile?.full_name || auth.user?.email || ''

  let body = children
  if (auth.loading || !auth.user) body = <div className="dash-loading"><span className="spinner" /> Loading…</div>
  else if (admin && !isAdmin)
    body = (
      <div className="panel dash-empty">
        <span className="missing-icon"><Icon name="settings" size={26} /></span>
        <h2>Admins only</h2>
        <p className="muted">Your account doesn’t have access to the admin dashboard.</p>
        <Link to="/dashboard" className="btn btn-dark">Go to my dashboard</Link>
      </div>
    )

  const tabs = [
    { to: '/dashboard', label: 'My cards', icon: 'card' },
    isAdmin && { to: '/admin', label: 'Admin', icon: 'chart' },
  ].filter(Boolean)

  return (
    <div className="dash-page">
      <header className="dash-bar">
        <div className="container dash-bar-inner">
          <Logo />
          <nav className="dash-tabs">
            {tabs.map((t) => (
              <Link key={t.to} to={t.to} className={path === t.to ? 'on' : ''} aria-current={path === t.to ? 'page' : undefined}>
                <Icon name={t.icon} size={16} /> <span className="hide-xs">{t.label}</span>
              </Link>
            ))}
          </nav>
          {auth.user && (
            <div className="dash-user">
              <span className="dash-avatar" title={auth.user.email}>{initials(name)}</span>
              <button className="btn btn-ghost btn-sm" onClick={async () => { await signOut(); navigate('/') }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="container dash-main">
        <div className="dash-head">
          <div>
            <span className="eyebrow"><span className="eyebrow-dot" /> {admin ? 'Admin' : 'Dashboard'}</span>
            <h1>{title}</h1>
          </div>
          {actions && auth.user && (!admin || isAdmin) && <div className="dash-head-actions">{actions}</div>}
        </div>
        {body}
      </main>
    </div>
  )
}

export function StatTile({ label, value, sub, icon }) {
  return (
    <div className="stat-tile">
      <span className="stat-ic"><Icon name={icon} size={18} /></span>
      <span className="stat-label">{label}</span>
      <b className="stat-value">{value ?? '–'}</b>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '–')
export const fmtNum = (n) => (n == null ? '–' : Number(n).toLocaleString())
