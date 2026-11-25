import { useState } from 'react'
import { Nav, Footer } from '../components/SiteChrome.jsx'
import Icon, { SocialBadge } from '../components/Icon.jsx'
import BusinessCard, { Avatar } from '../components/BusinessCard.jsx'
import { Link, navigate } from '../router.jsx'
import { SAMPLE_CARD, SOCIALS } from '../lib.js'
import { FREE_FEATURES, PRO_FEATURES, PRICE } from '../config.js'

const DEMO = { ...SAMPLE_CARD, socials: { ...SAMPLE_CARD.socials } }

const FAQS = [
  ['Is digibiz free?', 'Storing the business cards you collect is free, with no limit. Creating and sharing your own digital card needs digibiz Pro, from $5 a month.'],
  ['Can I keep the paper cards people give me?', 'Yes. Snap the front and back, add notes about where you met and tag them. Your card wallet is searchable and exports to your phone contacts or a spreadsheet.'],
  ['Are the cards in my wallet private?', 'Yes. Only you can see the cards and photos in your wallet. They are stored in your account, not shared with anyone, and you can export or delete them at any time.'],
  ['What happens if I stop paying for Pro?', 'Your published cards go offline, so their links, QR codes and NFC cards show that the card isn’t available. Nothing is deleted: resubscribe and they come straight back. Your wallet stays free either way.'],
  ['Do the people I share with need an app?', 'No. Your card opens in any browser. They can tap “Save contact” to add you to their phone in one step.'],
  ['Where is my card stored?', 'When you press Publish, your card is saved securely so your short link, QR code and NFC card always show your latest details. Only you can edit it, from any device you sign in on.'],
  ['Can I update my card after sharing it?', 'Yes. Your link never changes. Edit your card, press Publish, and everyone with your link, QR code or NFC card sees the update.'],
  ['Can I print the QR code?', 'Yes. Download the QR as a high-resolution PNG and add it to flyers, packaging, name badges or your email signature.'],
  ['Does it work with NFC cards?', 'Yes. Get any blank NFC card or sticker (NTAG213/215/216), open “NFC card” in the editor and tap the card to your Android phone to write it. iPhone users can use the free NFC Tools app. We also give you print-ready front and back artwork.'],
]

const TESTIMONIALS = [
  { quote: 'I handed out 200 paper cards a month at trade fairs. Now it’s one QR on my badge and every lead lands straight in their phone contacts.', name: 'Tunde Bello', role: 'Sales Lead, Kora Logistics' },
  { quote: 'Set it up on my phone in under five minutes. The glass theme gets a comment at every meeting.', name: 'Chioma Eze', role: 'Brand Designer' },
  { quote: 'Our whole team uses digibiz. New hires get a card on day one, and nobody reprints anything when titles change.', name: 'Daniel Mensah', role: 'COO, Fieldline' },
]

function Hero() {
  return (
    <section className="hero">
      <div className="hero-glow" />
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Digital cards + free card wallet
          </span>
          <h1>
            Smart is your
            <br />
            Digital <span className="hero-pill"><Icon name="arrow" size={30} stroke={2.6} /></span>
            <br />
            Business <span className="ul">Card</span>
          </h1>
          <p className="lead">Create a beautiful card in minutes and share it with a link, QR code or NFC tap. Keep every card you’re handed in a free, searchable wallet.</p>
          <div className="hero-ctas">
            <Link to="/create" className="btn btn-dark btn-lg">
              Design my card
            </Link>
            <Link to="/login?mode=signup&next=/wallet" className="btn btn-outline btn-lg">
              Free card wallet
            </Link>
            <a href="#how" className="btn btn-ghost btn-lg">
              <span className="play">
                <Icon name="eye" size={16} />
              </span>
              See how it works
            </a>
          </div>
          <div className="hero-proof">
            <div className="faces">
              {['JD', 'TB', 'CE', 'DM'].map((i, n) => (
                <span key={i} className={`face f${n}`}>
                  {i}
                </span>
              ))}
            </div>
            <div>
              <strong>12k+</strong>
              <span>cards shared this month</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="orbit" aria-hidden="true">
            <svg viewBox="0 0 120 120">
              <defs>
                <path id="circ" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
              </defs>
              <text>
                <textPath href="#circ">SCROLL TO EXPLORE • SCROLL TO EXPLORE • </textPath>
              </text>
            </svg>
            <Icon name="arrow" size={18} style={{ transform: 'rotate(90deg)' }} />
          </div>
          <div className="float-chip chip-a">
            <Icon name="qr" size={16} /> QR share
          </div>
          <div className="float-chip chip-b lime">
            <Icon name="bolt" size={16} /> NFC ready
          </div>
          <div className="float-chip chip-c">
            <Icon name="card" size={16} /> Stored in your wallet
          </div>
          <Icon name="sparkle" size={30} className="spark s1" />
          <Icon name="sparkle" size={18} className="spark s2" />
          <div className="hero-card-wrap">
            <BusinessCard card={DEMO} tilt onSave={() => navigate('/create')} onShare={() => navigate('/create')} onQR={() => navigate('/create')} />
          </div>
        </div>
      </div>
      <div className="ribbon" aria-hidden="true">
        <div className="ribbon-track">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k}>
              {['SHARE INSTANTLY', 'DIGITAL CARD', 'FREE CARD WALLET', 'ONE TAP SAVE', 'QR + NFC', 'NEVER LOSE A CARD'].map((t) => (
                <span key={t + k} className="ribbon-item">
                  {t} <Icon name="sparkle" size={18} />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="section-head split">
          <h2>Why digibiz?</h2>
          <p className="muted">Paper cards get lost, go out of date and end up in the bin. A digibiz card is always current and works on every phone, and the cards you receive live safely in your wallet.</p>
        </div>
        <div className="bento">
          <div className="tile tile-editor">
            <div className="mini-form">
              <div className="mini-label">Your name</div>
              <div className="mini-input">John Doe<span className="caret" /></div>
              <div className="mini-label">Choose a theme</div>
              <div className="mini-themes">
                {['glass', 'lime', 'midnight', 'peach', 'mono'].map((t) => (
                  <span key={t} className={`swatch-chip theme-${t} ${t === 'glass' ? 'on' : ''}`} />
                ))}
              </div>
              <div className="mini-btn">
                Publish card <Icon name="sparkle" size={14} />
              </div>
            </div>
            <h3>Live card editor</h3>
            <p className="muted">Type, pick a theme, upload a photo, and watch your card update in real time.</p>
          </div>

          <div className="tile tile-social">
            <h3>Every link in one place</h3>
            <p className="muted">LinkedIn, Instagram, WhatsApp, X and more, one tap away.</p>
            <div className="social-cloud">
              {SOCIALS.map((s) => (
                <span key={s.key} className="social-tag">
                  <SocialBadge social={s} size={26} /> {s.label}
                </span>
              ))}
            </div>
          </div>

          <div className="tile tile-stat">
            <span className="stat-emoji">
              <Icon name="leaf" size={22} />
            </span>
            <div className="stat-num">100%</div>
            <p className="muted">Paper-free networking</p>
          </div>

          <div className="tile tile-rating">
            <div className="stat-num">4.9</div>
            <div className="faces small">
              {['RF', 'BS', 'JL'].map((i, n) => (
                <span key={i} className={`face f${n}`}>
                  {i}
                </span>
              ))}
            </div>
            <p>Loved by freelancers, founders and sales teams</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function How() {
  const steps = [
    { n: '01', t: 'Add your details', d: 'Name, title, phone, email, website and the social profiles you want people to find.', v: 'form' },
    { n: '02', t: 'Make it yours', d: 'Upload a photo and choose from glass, lime, midnight and more. No design skills needed.', v: 'theme' },
    { n: '03', t: 'Publish and share', d: `Publish with digibiz Pro ($${PRICE.month}/month), then send your link, show your QR code, or write it to an NFC card. People save you in one tap.`, v: 'share' },
  ]
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head center">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> How it works
          </span>
          <h2>Three steps to your own digital card</h2>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div className={`step ${i % 2 ? 'rev' : ''}`} key={s.n}>
              <div className="step-visual">
                {s.v === 'form' && (
                  <div className="sv-form">
                    {['Full name', 'Job title', 'Email'].map((l, k) => (
                      <div key={l} className="sv-row">
                        <span>{l}</span>
                        <div className="sv-line" style={{ width: `${80 - k * 15}%` }} />
                      </div>
                    ))}
                  </div>
                )}
                {s.v === 'theme' && (
                  <div className="sv-themes">
                    {['glass', 'lime', 'midnight'].map((t, k) => (
                      <div key={t} className={`sv-card theme-${t}`} style={{ '--i': k }}>
                        <Avatar card={{ name: 'J D' }} size={32} />
                        <div className="sv-l" />
                        <div className="sv-l short" />
                      </div>
                    ))}
                  </div>
                )}
                {s.v === 'share' && (
                  <div className="sv-share">
                    <div className="sv-qr">
                      <Icon name="qr" size={56} stroke={1.4} />
                    </div>
                    <div className="sv-opts">
                      <span>
                        <Icon name="link" size={16} /> Copy link
                      </span>
                      <span>
                        <Icon name="qr" size={16} /> Show QR
                      </span>
                      <span className="on">
                        <Icon name="download" size={16} /> Save contact
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="step-copy">
                <span className="step-n">{s.n}</span>
                <h3>{s.t}</h3>
                <p className="muted">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const WALLET_POINTS = [
  { icon: 'upload', t: 'Snap the front and back', d: 'Take a photo the moment you’re handed a card. The paper can go, the details stay.' },
  { icon: 'edit', t: 'Remember the conversation', d: 'Add notes, where and when you met, tags and favourites.' },
  { icon: 'search', t: 'Find anyone in seconds', d: 'Search names, companies, notes and tags, or filter by event.' },
  { icon: 'download', t: 'Take it with you', d: 'Export to your phone’s contacts (vCard) or a spreadsheet (CSV) whenever you like.' },
]

const WALLET_DEMO = [
  { n: 'Amara Okafor', c: 'Head of Sales · Kora', tags: ['client', 'tech-expo'], fav: true, tone: 'a' },
  { n: 'Liam Chen', c: 'Architect · Studio Nine', tags: ['partner'], tone: 'b' },
  { n: 'Sofia Reyes', c: 'Founder · Brightside', tags: ['tech-expo'], tone: 'c' },
]

function WalletSection() {
  return (
    <section className="section" id="wallet">
      <div className="container wallet-promo">
        <div className="wallet-promo-copy">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Free, with no limit
          </span>
          <h2>Never lose a business card again</h2>
          <p className="muted">Every card you’re handed goes into your digibiz wallet: photographed, searchable and backed up to your account. It’s free for everyone.</p>
          <div className="wp-points">
            {WALLET_POINTS.map((p) => (
              <div key={p.t} className="wp-point">
                <span className="wp-ic">
                  <Icon name={p.icon} size={18} />
                </span>
                <div>
                  <b>{p.t}</b>
                  <p className="muted">{p.d}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/login?mode=signup&next=/wallet" className="btn btn-dark btn-lg">
            Start my free wallet <Icon name="arrow" size={18} />
          </Link>
        </div>

        <div className="wp-visual" aria-hidden="true">
          <div className="wp-search">
            <Icon name="search" size={16} /> tech-expo
          </div>
          <div className="wp-chips">
            <span className="on">All 48</span>
            <span>client</span>
            <span>tech-expo</span>
            <span>partner</span>
          </div>
          <div className="wp-list">
            {WALLET_DEMO.map((d) => (
              <div key={d.n} className="wp-item">
                <div className={`wp-paper tone-${d.tone}`}>
                  <span className="wp-logo" />
                  <span className="wp-line" />
                  <span className="wp-line short" />
                  {d.fav && <span className="wp-fav">★</span>}
                </div>
                <div className="wp-info">
                  <b>{d.n}</b>
                  <small>{d.c}</small>
                  <span className="wp-tags">
                    {d.tags.map((t) => (
                      <i key={t}>{t}</i>
                    ))}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="float-chip wp-chip lime">
            <Icon name="download" size={16} /> Export to contacts
          </div>
        </div>
      </div>
    </section>
  )
}

function Plans() {
  const plans = [
    { name: 'Free', price: '$0', note: 'Your business card wallet', sub: 'Free forever', feats: FREE_FEATURES, cta: 'Start my free wallet', to: '/login?mode=signup&next=/wallet' },
    { name: 'Pro', price: `$${PRICE.month}`, note: 'Your own digital card', sub: `Billed monthly, or $${PRICE.year}/month billed yearly`, feats: PRO_FEATURES, cta: 'Go Pro', to: '/billing', hot: true },
  ]
  return (
    <section className="section" id="plans">
      <div className="container">
        <div className="section-head center">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Pricing
          </span>
          <h2>Free to collect. Pro to share.</h2>
          <p className="muted">Keep every card you receive for free. Upgrade when you want a digital card of your own. Cancel any time.</p>
        </div>
        <div className="plans two">
          {plans.map((p) => (
            <div key={p.name} className={`plan ${p.hot ? 'hot' : ''}`}>
              {p.hot && <span className="plan-badge">For your own card</span>}
              <h3>{p.name}</h3>
              <p className="muted">{p.note}</p>
              <div className="price">
                {p.price}
                <span>/mo</span>
              </div>
              <p className="price-note">{p.sub}</p>
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
        <p className="center plans-more">
          <Link to="/pricing" className="inline-link">Compare plans in detail</Link>
        </p>
      </div>
    </section>
  )
}

function AppShowcase() {
  return (
    <section className="section">
      <div className="container">
        <div className="showcase">
          <div className="showcase-copy">
            <h2>Your network, in your pocket</h2>
            <p>Manage your card and your wallet from any phone. Update your details, share in seconds, and save the cards you’re handed before they get lost.</p>
            <Link to="/create" className="btn btn-lime btn-lg">
              Build my card <Icon name="arrow" size={18} />
            </Link>
          </div>
          <div className="phones">
            <div className="phone phone-intro">
              <div className="phone-status">
                <span>9:41</span>
                <span className="sig" />
              </div>
              <div className="intro-art">
                <div className="intro-card theme-glass">
                  <Avatar card={DEMO} size={44} />
                  <div>
                    <b>{DEMO.name}</b>
                    <small>{DEMO.title}</small>
                  </div>
                </div>
              </div>
              <div className="intro-sheet">
                <div className="dots">
                  <i className="on" />
                  <i />
                  <i />
                </div>
                <h4>Smart is your Digital Business Card</h4>
                <Link to="/create" className="btn btn-dark btn-block">
                  Get started
                </Link>
              </div>
            </div>
            <div className="phone phone-home">
              <div className="phone-status">
                <span>9:41</span>
                <span className="sig" />
              </div>
              <div className="ph-top">
                <span className="ph-ic">
                  <Icon name="eye" size={18} />
                </span>
                <b>Home</b>
                <span className="ph-ic">
                  <Icon name="send" size={18} />
                </span>
              </div>
              <div className="ph-profile">
                <div className="ph-row">
                  <small>Business profile</small>
                  <Avatar card={DEMO} size={52} />
                  <div className="ph-count">
                    <b>36+</b>
                    <small>Connected</small>
                  </div>
                </div>
                <b className="ph-name">{DEMO.name}</b>
                <small className="ph-role">Founder at {DEMO.company}</small>
                <div className="ph-links">
                  <span>Your links</span>
                  <span className="toggle on" />
                </div>
              </div>
              <div className="ph-grid">
                <div className="ph-tile">
                  <div className="ph-badges">
                    {SOCIALS.slice(0, 4).map((s) => (
                      <SocialBadge key={s.key} social={s} size={22} />
                    ))}
                  </div>
                  <b className="ph-big">04</b>
                  <small>Active social links</small>
                </div>
                <div className="ph-tile">
                  <small className="ph-t">Recent connected</small>
                  {['Bessie', 'Julie', 'Regina'].map((n, k) => (
                    <div className="ph-person" key={n}>
                      <span className={`face xs f${k}`}>{n[0]}</span>
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ph-upgrade">
                <Icon name="sparkle" size={14} /> Upgrade now
              </div>
              <div className="ph-nav">
                <Icon name="home" size={20} />
                <Icon name="qr" size={20} />
                <span className="ph-plus">
                  <Icon name="plus" size={18} />
                </span>
                <Icon name="chart" size={20} />
                <Icon name="settings" size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  const [i, setI] = useState(0)
  const t = TESTIMONIALS[i]
  const go = (d) => setI((x) => (x + d + TESTIMONIALS.length) % TESTIMONIALS.length)
  return (
    <section className="section">
      <div className="container">
        <div className="testi">
          <div className="testi-left">
            <h2>What people are saying</h2>
            <div className="testi-nav">
              <button onClick={() => go(-1)} aria-label="Previous">
                <Icon name="arrowLeft" />
              </button>
              <button className="on" onClick={() => go(1)} aria-label="Next">
                <Icon name="arrow" />
              </button>
            </div>
          </div>
          <figure className="testi-card" key={i}>
            <span className="quote-mark">“</span>
            <blockquote>{t.quote}</blockquote>
            <figcaption>
              <span className={`face f${i}`}>{t.name.split(' ').map((w) => w[0]).join('')}</span>
              <span>
                <b>{t.name}</b>
                <small>{t.role}</small>
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="section" id="faq">
      <div className="container">
        <div className="faq-wrap">
          <div className="section-head center">
            <h2>Frequently asked questions</h2>
            <p className="muted">Everything you need to know before you swap paper for pixels.</p>
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
  )
}

export default function Landing() {
  return (
    <div className="landing">
      <Nav />
      <Hero />
      <Features />
      <WalletSection />
      <How />
      <Plans />
      <AppShowcase />
      <Testimonials />
      <Faq />
      <Footer />
    </div>
  )
}
