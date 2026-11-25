import { useEffect, useState } from 'react'
import Logo from '../components/Logo.jsx'
import Icon from '../components/Icon.jsx'
import { Link, navigate } from '../router.jsx'
import { supabase } from '../supabase.js'
import { useAuth } from '../auth.js'

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/wallet')

export default function Login() {
  const next = safeNext(new URLSearchParams(window.location.search).get('next'))
  const [mode, setMode] = useState(window.location.pathname.startsWith('/signup') || new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'signin')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { user, loading } = useAuth()
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    document.title = 'Sign in | digibiz'
    return () => (document.title = 'digibiz | Smart Digital Business Cards')
  }, [])

  useEffect(() => {
    if (!loading && user) navigate(next)
  }, [loading, user, next])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const email = form.email.trim()
    let res
    if (mode === 'signin') {
      res = await supabase.auth.signInWithPassword({ email, password: form.password })
    } else if (mode === 'signup') {
      res = await supabase.auth.signUp({
        email,
        password: form.password,
        options: { data: { full_name: form.name.trim() }, emailRedirectTo: `${window.location.origin}${next}` },
      })
      if (!res.error && !res.data.session) setNotice(`We sent a confirmation link to ${email}. Open it to finish creating your account.`)
    } else {
      res = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/dashboard?tab=account` })
      if (!res.error) setNotice(`If ${email} has an account, a reset link is on its way.`)
    }
    setBusy(false)
    if (res.error) setError(res.error.message)
  }

  const titles = { signin: 'Welcome back', signup: 'Create your account', reset: 'Reset your password' }

  return (
    <div className="auth-page">
      <div className="hero-glow" />
      <div className="auth-box">
        <Logo />
        <form className="panel auth-card" onSubmit={submit}>
          <div>
            <h1>{titles[mode]}</h1>
            <p className="muted">
              {mode === 'signup'
                ? 'Store every business card you collect for free. Upgrade to Pro to publish your own.'
                : mode === 'reset'
                  ? 'We’ll email you a link to choose a new password.'
                  : 'Sign in to manage your cards.'}
            </p>
          </div>
          {mode === 'signup' && (
            <label className="field">
              <span className="field-label">Full name</span>
              <input value={form.name} onChange={set('name')} placeholder="John Doe" autoComplete="name" maxLength={80} />
            </label>
          )}
          <label className="field">
            <span className="field-label">Email</span>
            <input required type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" autoComplete="email" />
          </label>
          {mode !== 'reset' && (
            <label className="field">
              <span className="field-label">Password</span>
              <input
                required
                type="password"
                minLength={mode === 'signup' ? 8 : undefined}
                value={form.password}
                onChange={set('password')}
                placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </label>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice" role="status"><Icon name="mail" size={16} /> {notice}</p>}
          <button type="submit" className="btn btn-dark btn-lg btn-block" disabled={busy}>
            {busy ? <span className="spinner light" /> : null}
            {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
          <div className="auth-switch">
            {mode === 'signin' && (
              <>
                <button type="button" className="link-btn" onClick={() => setMode('reset')}>Forgot password?</button>
                <span>
                  New here? <button type="button" className="link-btn strong" onClick={() => setMode('signup')}>Create an account</button>
                </span>
              </>
            )}
            {mode !== 'signin' && (
              <span>
                Already have an account? <button type="button" className="link-btn strong" onClick={() => setMode('signin')}>Sign in</button>
              </span>
            )}
          </div>
        </form>
        <Link to="/create" className="auth-skip">
          Or make a card without an account <Icon name="arrow" size={16} />
        </Link>
      </div>
    </div>
  )
}
