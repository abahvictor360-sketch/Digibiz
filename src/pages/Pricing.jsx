import { Fragment, useEffect, useState } from 'react'
import { Nav, Footer } from '../components/SiteChrome.jsx'
import Icon from '../components/Icon.jsx'
import { Link } from '../router.jsx'

const PLANS = [
  { name: 'Starter', m: 0, y: 0, note: 'For trying it out', feats: ['1 digital card', 'QR code & vCard', '5 themes', 'Unlimited shares'], cta: 'Start for free' },
  { name: 'Pro', m: 6, y: 5, note: 'For professionals', feats: ['3 digital cards', 'Custom short link', 'Lead capture form', 'Premium themes'], cta: 'Go Pro', hot: true },
  { name: 'Team', m: 19, y: 15, note: 'Up to 10 people', feats: ['10 team cards', 'Shared brand kit', 'Admin dashboard', 'Priority support'], cta: 'Start team trial' },
]

const COMPARE = [
  ['Cards', [
    ['Digital cards', '1', '3', '10'],
    ['Unlimited sharing', true, true, true],
    ['QR code download', true, true, true],
    ['Save-to-contacts (vCard)', true, true, true],
  ]],
  ['Design', [
    ['Themes', '5', '5 + premium', '5 + premium'],
    ['Remove digibiz badge', false, true, true],
    ['Shared brand kit', false, false, true],
  ]],
  ['Growth', [
    ['Custom short link', false, true, true],
    ['Lead capture form', false, true, true],
    ['Admin dashboard', false, false, true],
    ['Priority support', false, false, true],
  ]],
]

const FAQS = [
  ['Is the Starter plan really free?', 'Yes. Starter is free forever, and no card details are needed. Create your card, share it and let people save your contact.'],
  ['Can I switch plans later?', 'Any time. Upgrade or downgrade from your account and the change applies from your next billing date.'],
  ['How does yearly billing work?', 'Pay for 12 months up front and save about 20% compared with paying monthly.'],
  ['Do you offer plans for larger teams?', 'Yes. For more than 10 people, get in touch and we’ll put together a plan for your organisation.'],
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
            Simple pricing, <span className="ul">no paper</span>
          </h1>
          <p className="lead">Start free and upgrade when you need more cards, your own link or lead capture. Cancel any time.</p>
          <div className="toggle-row">
            <span className={!yearly ? 'on' : ''}>Monthly</span>
            <button className={`toggle ${yearly ? 'on' : ''}`} onClick={() => setYearly((y) => !y)} aria-pressed={yearly} aria-label="Bill yearly" />
            <span className={yearly ? 'on' : ''}>
              Yearly <em>save 20%</em>
            </span>
          </div>
        </div>
      </section>

      <section className="section tight-top">
        <div className="container">
          <div className="plans">
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
                <Link to={p.m === 0 ? '/create' : '/contact'} className={`btn btn-block ${p.hot ? 'btn-lime' : 'btn-outline'}`}>
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
                      <th colSpan={4} scope="colgroup">{group}</th>
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
