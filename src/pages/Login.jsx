import { useEffect, useState } from 'react'
import Logo from '../components/Logo.jsx'
import Icon from '../components/Icon.jsx'
import { Link, navigate } from '../router.jsx'
import { signIn, signUp, useAuth } from '../auth.js'

// Only allow redirects back into this site.
function safeNext(raw) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/wallet'
}

export default function Login() {
  const params = new URLSearchParams(window.location.search)
  const next = safeNext(params.get('next'))
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { user, loading } = useAuth()

  useEffect(() => {
    document.title = mode === 'signup' ? 'Create account | digibiz' : 'Sign in | digibiz'
  }, [mode])
  useEffect(() => {
    if (!loading && user) navigate(next)
  }, [loading, user, next])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'signup') await signUp(form.email, form.password, form.name)
      else await signIn(form.email, form.password)
      navigate(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-top">
        <Logo />
      </header>
      <main className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <h1>{mode === 'signup' ? 'Create your free account' : 'Welcome back'}</h1>
          <p className="muted">
            {mode === 'signup' ? 'Save every business card you collect, free forever. Go Pro anytime to publish your own.' : 'Sign in to your wallet and your card.'}
          </p>
          <div className="auth-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>
              Sign in
            </button>
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>
              Create account
            </button>
          </div>
          {mode === 'signup' && (
            <label className="field">
              <span className="field-label">Your name</span>
              <input value={form.name} onChange={set('name')} placeholder="John Doe" autoComplete="name" maxLength={60} />
            </label>
          )}
          <label className="field">
            <span className="field-label">Email</span>
            <input type="email" required value={form.email} onChange={set('email')} placeholder="you@company.com" autoComplete="email" />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              required
              minLength={mode === 'signup' ? 8 : undefined}
              value={form.password}
              onChange={set('password')}
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-dark btn-lg btn-block" disabled={busy}>
            {busy ? <span className="spinner" /> : null} {mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
          <p className="field-hint center">
            <Link to="/" className="inline-link">
              <Icon name="arrowLeft" size={14} /> Back to home
            </Link>
          </p>
        </form>
      </main>
    </div>
  )
}
