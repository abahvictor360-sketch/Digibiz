import { Fragment, useEffect, useState } from 'react'
import { Nav, Footer } from '../components/SiteChrome.jsx'
import Icon from '../components/Icon.jsx'
import { Link } from '../router.jsx'
import { PRICE } from '../config.js'

const PLANS = [
  {
    name: 'Free', m: 0, y: 0, note: 'Your business card wallet',
    feats: ['Unlimited card storage', 'Photos of front and back', 'Notes, tags and where you met', 'Export to vCard and CSV'],
    cta: 'Start for free', to: '/login?mode=signup&next=/wallet',
  },
  {
    name: 'Pro', m: PRICE.month, y: PRICE.year, note: 'Your own digital card',
    feats: ['Everything in Free', 'Create and publish digital cards', 'Short link, QR code and NFC', 'See who views your cards'],
    cta: 'Go Pro', to: '/billing', hot: true,
  },
]

const COMPARE = [
  ['Wallet', [
    ['Store business cards you collect', 'Unlimited', 'Unlimited'],
    ['Front and back photos', true, true],
    ['Notes, tags, search', true, true],
    ['Export to vCard and CSV', true, true],
  ]],
  ['Your digital card', [
    ['Create and publish cards', false, true],
    ['Permanent short link and QR code', false, true],
    ['Write to NFC cards', false, true],
    ['Save-to-contacts button (vCard)', false, true],
    ['View analytics', false, true],
  ]],
]

const FAQS = [
  ['Is the wallet really free?', 'Yes. Store as many business cards as you like, with photos, notes and tags, at no cost and with no card details needed.'],
  ['What do I get with Pro?', 'Pro lets you create, publish and share your own digital business cards with a permanent link, QR code and NFC support, and see how often they are viewed.'],
  ['What happens if I cancel Pro?', 'Your published cards go offline at the end of the period you paid for. Nothing is deleted, and they come back as soon as you resubscribe. Your wallet stays free.'],
  ['How does yearly billing work?', `Pay $${PRICE.year * 12} for 12 months up front, which works out at $${PRICE.year} a month instead of $${PRICE.month}.`],
  ['How do I pay?', 'Payments are handled securely by Stripe. You can update your card, switch between monthly and yearly, or cancel at any time from Plan & billing.'],
]

function Cell({ v }) {
  if (v === true) return <span className="cmp-yes"><Icon name="check" size={16} stroke={2.4} /></span>
  if (v === false) return <span className="cmp-no" aria-label="Not included">✕</span>
  return <span>{v}</span>
}

export default function Pricing() {
  const [yearly, setYearly] = useState(false)
  const [open, setOpen] = useState(0)
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
            Free to collect, <span className="ul">Pro to share</span>
          </h1>
          <p className="lead">Keep every business card you collect for free. Go Pro to create and share your own. Cancel any time.</p>
          <div className="toggle-row">
            <span className={!yearly ? 'on' : ''}>Monthly</span>
            <button className={`toggle ${yearly ? 'on' : ''}`} onClick={() => setYearly((y) => !y)} aria-pressed={yearly} aria-label="Bill yearly" />
            <span className={yearly ? 'on' : ''}>
              Yearly <em>save {Math.round((1 - PRICE.year / PRICE.month) * 100)}%</em>
            </span>
          </div>
        </div>
      </section>

      <section className="section tight-top">
        <div className="container">
          <div className="plans two">
            {PLANS.map((p) => (
              <div key={p.name} className={`plan ${p.hot ? 'hot' : ''}`}>
                {p.hot && <span className="plan-badge">Most popular</span>}
                <h3>{p.name}</h3>
                <p className="muted">{p.note}</p>
                <div className="price">
                  ${yearly ? p.y : p.m}
                  <span>/mo</span>
                </div>
                <p className="price-note">{p.m === 0 ? 'Free forever' : yearly ? `Billed $${p.y * 12} yearly` : 'Billed monthly'}</p>
                <ul>
                  {p.feats.map((f) => (
                    <li key={f}>
                      <Icon name="check" size={16} /> {f}
                    </li>
                  ))}
                </ul>
                <Link to={p.to} className={`btn btn-block ${p.hot ? 'btn-lime' : 'btn-outline'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
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
                  {PLANS.map((p) => (
                    <th scope="col" key={p.name} className={p.hot ? 'hot' : ''}>{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([group, rows]) => (
                  <Fragment key={group}>
                    <tr className="cmp-group">
                      <th colSpan={PLANS.length + 1} scope="colgroup">{group}</th>
                    </tr>
                    {rows.map(([label, ...vals]) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        {vals.map((v, k) => (
                          <td key={k} className={PLANS[k].hot ? 'hot' : ''}>
                            <Cell v={v} />
                          </td>
                        ))}
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
