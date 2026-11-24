import { useState } from 'react'
import Logo from './Logo.jsx'
import Icon from './Icon.jsx'
import { Link, useLocation } from '../router.jsx'

const LINKS = [
  { to: '/#features', label: 'Features' },
  { to: '/#how', label: 'How it works' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
]

export function Nav() {
  const [open, setOpen] = useState(false)
  const { path } = useLocation()
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Logo />
        <nav className={`nav-links ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
          {LINKS.map((l) =>
            l.to.startsWith('/#') ? (
              <a key={l.to} href={path === '/' ? l.to.slice(1) : l.to}>
                {l.label}
              </a>
            ) : (
              <Link key={l.to} to={l.to} className={path === l.to ? 'active' : ''} aria-current={path === l.to ? 'page' : undefined}>
                {l.label}
              </Link>
            )
          )}
        </nav>
        <div className="nav-cta">
          <Link to="/create" className="btn btn-dark btn-sm">
            Create card
          </Link>
          <button className="nav-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'close' : 'plus'} size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}

export function Footer({ cta = true }) {
  return (
    <footer className="footer">
      <div className="container">
        {cta && (
          <div className="cta-band">
            <h2>Design. Share. Connect.</h2>
            <Link to="/create" className="btn btn-lime btn-lg">
              Create my card <Icon name="arrow" size={18} />
            </Link>
          </div>
        )}
        <div className="foot-grid">
          <div>
            <Logo />
            <p className="muted">Smart digital business cards for people who make connections for a living.</p>
          </div>
          <div>
            <h4>Product</h4>
            <a href="/#features">Features</a>
            <Link to="/pricing">Pricing</Link>
            <Link to="/create">Card editor</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link to="/contact">Contact us</Link>
            <a href="/#faq">FAQ</a>
            <a href="/#how">How it works</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} digibiz. All rights reserved.</span>
          <span>Made for networking, not landfill.</span>
        </div>
      </div>
    </footer>
  )
}
