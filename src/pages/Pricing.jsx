import { Fragment, useEffect, useState } from 'react'
import { Nav, Footer } from '../components/SiteChrome.jsx'
import Icon from '../components/Icon.jsx'
import { GoProButton, useBilling } from '../components/UpgradeModal.jsx'
import { Link } from '../router.jsx'
import { formatPrice, loginUrl, useAuth } from '../auth.js'

const COMPARE = [
  ['Wallet', [
    ['Save business cards', 'Unlimited', 'Unlimited'],
    ['Scan QR codes & tap NFC cards', true, true],
    ['Paper cards with photos', true, true],
    ['Notes, tags & search', true, true],
    ['Synced on every device', true, true],
  ]],
  ['Your own card', [
    ['Design your card', true, true],
    ['Publish to a permanent link', false, true],
    ['QR code & save-to-contacts', false, true],
    ['Write to NFC cards', false, true],
    ['Print-ready card designs', false, true],
  ]],
]

const FAQS = [
  ['Is the wallet really free?', 'Yes. Saving, organising and searching business cards is free forever, with no payment details needed.'],
  ['What do I get with Pro?', 'Pro lets you publish your own digital business card to a permanent link, share it by QR code or NFC, and download print-ready designs. Edit it anytime and everyone sees the update.'],
  ['Can I cancel anytime?', 'Yes. Cancel from your account in two clicks. Pro stays active until the end of the month you’ve paid for, and your wallet stays free.'],
  ['What happens to my card if I cancel?', 'Your published card stops being editable and you can’t publish changes. Resume Pro anytime to pick up where you left off.'],
  ['Do you offer plans for teams?', 'Yes. For cards for your whole team with shared branding, get in touch and we’ll put together a plan.'],
]

function Cell({ v }) {
  if (v === true) return <span className="cmp-yes"><Icon name="check" size={16} stroke={2.4} /></span>
  if (v === false) return <span className="cmp-no" aria-label="Not included">✕</span>
  return <span>{v}</span>
}

export default function Pricing() {
  const [open, setOpen] = useState(0)
  const cfg = useBilling()
  const { user } = useAuth()
  const price = cfg ? formatPrice(cfg.priceCents, cfg.currency) : '$6'
  const cancelled = new URLSearchParams(window.location.search).get('checkout') === 'cancelled'

  useEffect(() => {
    document.title = 'Pricing | digibiz'
    return () => (document.title = 'digibiz | Smart Digital Business Cards')
  }, [])

  return (
    <div className="landing">
      <Nav />
      <section className="page-hero">
        <div className="hero-glow" />
        <div className="container page-hero-inner">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Pricing
          </span>
          <h1>
            Collect free. <span className="ul">Create with Pro.</span>
          </h1>
          <p className="lead">Keep every business card you’re given in your free wallet. Go Pro when you’re ready to publish your own.</p>
          {cancelled && <p className="notice">Checkout was cancelled. You haven’t been charged.</p>}
        </div>
      </section>

      <section className="section tight-top">
        <div className="container">
          <div className="plans two">
            <div className="plan">
              <h3>Wallet</h3>
              <p className="muted">For everyone you meet</p>
              <div className="price">
                $0<span>/forever</span>
              </div>
              <ul>
                {['Save unlimited business cards', 'Scan QR codes & tap NFC cards', 'Snap paper cards', 'Notes, tags & search', 'Synced across devices'].map((f) => (
                  <li key={f}>
                    <Icon name="check" size={16} /> {f}
                  </li>
                ))}
              </ul>
              <Link to={user ? '/wallet' : `${loginUrl('/wallet')}&mode=signup`} className="btn btn-block btn-outline">
                {user ? 'Open my wallet' : 'Create free wallet'}
              </Link>
            </div>
            <div className="plan hot">
              <span className="plan-badge">Create your card</span>
              <h3>Pro</h3>
              <p className="muted">Everything in Wallet, plus</p>
              <div className="price">
                {price}
                <span>/month</span>
              </div>
              <ul>
                {['Publish your own digital card', 'Permanent link + QR code', 'Write it to NFC cards', 'Print-ready card designs', 'Edit anytime, links never change'].map((f) => (
                  <li key={f}>
                    <Icon name="check" size={16} /> {f}
                  </li>
                ))}
              </ul>
              {user?.pro ? (
                <Link to="/create" className="btn btn-block btn-lime">
                  Edit my card
                </Link>
              ) : (
                <GoProButton label="Go Pro" />
              )}
            </div>
          </div>
          <p className="muted center teams-note">
            Need cards for your whole team? <Link to="/contact" className="inline-link">Talk to us</Link>.
          </p>
        </div>
      </section>

      <section className="section tight-top">
        <div className="container">
          <div className="section-head center">
            <h2>Compare plans</h2>
          </div>
          <div className="cmp-wrap">
            <table className="cmp">
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Feature</span></th>
                  <th scope="col">Wallet</th>
                  <th scope="col" className="hot">Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([group, rows]) => (
                  <Fragment key={group}>
                    <tr className="cmp-group">
                      <th colSpan={3} scope="colgroup">{group}</th>
                    </tr>
                    {rows.map(([label, free, pro]) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        <td><Cell v={free} /></td>
                        <td className="hot"><Cell v={pro} /></td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section tight-top">
        <div className="container">
          <div className="faq-wrap">
            <div className="section-head center">
              <h2>Pricing questions</h2>
              <p className="muted">
                Something else? <Link to="/contact" className="inline-link">Contact us</Link>.
              </p>
            </div>
            <div className="faq">
              {FAQS.map(([q, a], k) => (
                <div key={q} className={`faq-item ${open === k ? 'open' : ''}`}>
                  <button onClick={() => setOpen(open === k ? -1 : k)} aria-expanded={open === k}>
                    {q}
                    <span className="faq-ic">
                      <Icon name="plus" size={16} />
                    </span>
                  </button>
                  <div className="faq-a">
                    <p>{a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
