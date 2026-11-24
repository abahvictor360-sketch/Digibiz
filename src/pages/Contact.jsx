import { useEffect, useState } from 'react'
import { Nav, Footer } from '../components/SiteChrome.jsx'
import Icon from '../components/Icon.jsx'
import { Link } from '../router.jsx'
import { CONTACT_EMAIL, CONTACT_WHATSAPP } from '../config.js'
import { supabase } from '../supabase.js'
import { useAuth } from '../auth.js'

const TOPICS = ['General question', 'Sales & team plans', 'Support', 'Partnerships']

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', topic: TOPICS[0], message: '' })
  const [sent, setSent] = useState('')
  const [sending, setSending] = useState(false)
  const { user } = useAuth()
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    document.title = 'Contact us | digibiz'
    return () => (document.title = 'digibiz | Smart Digital Business Cards')
  }, [])

  const mailto = () => {
    const subject = `[digibiz] ${form.topic}: ${form.name}`
    const body = `${form.message}\n\n${form.name}\n${form.email}`
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSent('mail')
  }

  // Save to the database (admins read it in /admin); fall back to the email app.
  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    const { error } = await supabase.from('contact_messages').insert({
      name: form.name.trim().slice(0, 100),
      email: form.email.trim().slice(0, 200),
      topic: form.topic,
      message: form.message.trim().slice(0, 2000),
      user_id: user?.id ?? null,
    })
    setSending(false)
    if (error) mailto()
    else setSent('db')
  }

  const channels = [
    { icon: 'mail', title: 'Email us', text: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
    CONTACT_WHATSAPP && { icon: 'phone', title: 'WhatsApp', text: `+${CONTACT_WHATSAPP}`, href: `https://wa.me/${CONTACT_WHATSAPP}` },
    { icon: 'bolt', title: 'Quick replies', text: 'We usually answer within one business day.' },
  ].filter(Boolean)

  return (
    <div className="landing">
      <Nav />
      <section className="page-hero">
        <div className="hero-glow" />
        <div className="container page-hero-inner">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Contact us
          </span>
          <h1>
            Let’s <span className="ul">connect</span>
          </h1>
          <p className="lead">Questions about digibiz, team plans or partnerships? Send us a message and a real person will get back to you.</p>
        </div>
      </section>

      <section className="section tight-top">
        <div className="container contact-grid">
          <div className="contact-side">
            {channels.map((c) => {
              const Tag = c.href ? 'a' : 'div'
              return (
                <Tag key={c.title} className="contact-chan" {...(c.href ? { href: c.href } : {})}>
                  <span className="contact-ic">
                    <Icon name={c.icon} size={20} />
                  </span>
                  <span>
                    <b>{c.title}</b>
                    <small>{c.text}</small>
                  </span>
                  {c.href && <Icon name="arrow" size={18} className="contact-go" />}
                </Tag>
              )
            })}
            <div className="contact-promo">
              <h3>Want a card first?</h3>
              <p>It takes about two minutes and it’s free.</p>
              <Link to="/create" className="btn btn-lime btn-sm">
                Create my card <Icon name="arrow" size={16} />
              </Link>
            </div>
          </div>

          <form className="panel contact-form" onSubmit={submit}>
            {sent ? (
              <div className="contact-sent">
                <span className="missing-icon">
                  <Icon name="send" size={26} />
                </span>
                <h2>{sent === 'db' ? 'Message sent' : 'Almost there'}</h2>
                {sent === 'db' ? (
                  <p className="muted">Thanks, {form.name.split(' ')[0] || 'friend'}. We’ll reply to {form.email} soon.</p>
                ) : (
                  <p className="muted">
                    Your email app should have opened with your message ready to send. If it didn’t, email us at{' '}
                    <a className="inline-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                  </p>
                )}
                <button type="button" className="btn btn-outline" onClick={() => { setSent(''); setForm((f) => ({ ...f, message: '' })) }}>
                  Write another message
                </button>
              </div>
            ) : (
              <>
                <div className="panel-head">
                  <h2>Send a message</h2>
                </div>
                <div className="grid-2">
                  <label className="field">
                    <span className="field-label">Your name</span>
                    <input required value={form.name} onChange={set('name')} placeholder="John Doe" autoComplete="name" />
                  </label>
                  <label className="field">
                    <span className="field-label">Email</span>
                    <input required type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" autoComplete="email" />
                  </label>
                </div>
                <div className="field">
                  <span className="field-label">Topic</span>
                  <div className="topic-chips" role="radiogroup" aria-label="Topic">
                    {TOPICS.map((t) => (
                      <button type="button" key={t} role="radio" aria-checked={form.topic === t} className={`topic ${form.topic === t ? 'on' : ''}`} onClick={() => setForm((f) => ({ ...f, topic: t }))}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="field">
                  <span className="field-label">Message</span>
                  <textarea required rows={6} value={form.message} onChange={set('message')} placeholder="How can we help?" maxLength={2000} />
                </label>
                <button type="submit" className="btn btn-dark btn-lg" disabled={sending}>
                  {sending ? 'Sending…' : 'Send message'} <Icon name="send" size={18} />
                </button>
              </>
            )}
          </form>
        </div>
      </section>
      <Footer cta={false} />
    </div>
  )
}
