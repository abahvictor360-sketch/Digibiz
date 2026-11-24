import { useCallback, useEffect, useState } from 'react'
import DashShell, { StatTile, fmtDate, fmtNum } from '../components/DashShell.jsx'
import ViewsChart from '../components/ViewsChart.jsx'
import QRModal from '../components/QRModal.jsx'
import Icon from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'
import { Link } from '../router.jsx'
import { useAuth, must, refreshProfile } from '../auth.js'
import { supabase, rpc } from '../supabase.js'
import { cardLink, initials, loadPub } from '../lib.js'

export function CardRow({ c, owner, onToggle, onDelete, onQr, showToast }) {
  const link = cardLink(c.id)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      showToast('Link copied')
    } catch {
      window.prompt('Copy the card link', link)
    }
  }
  return (
    <div className={`card-row ${c.is_active ? '' : 'off'}`}>
      <span className="card-row-av">
        {c.data?.avatar ? <img src={c.data.avatar} alt="" /> : initials(c.name)}
      </span>
      <div className="card-row-main">
        <b>{c.name || 'Untitled'}</b>
        <span className="muted">{[c.data?.title, c.data?.company].filter(Boolean).join(' · ') || 'No title'}</span>
        <a className="card-row-link" href={`/c/${c.id}`} target="_blank" rel="noreferrer">{link.replace(/^https?:\/\//, '')}</a>
        {owner !== undefined && <span className="card-row-owner">{owner || 'No account (anonymous)'}</span>}
      </div>
      <div className="card-row-stats">
        <span><b>{fmtNum(c.view_count)}</b> {c.view_count === 1 ? 'view' : 'views'}</span>
        <span className="muted">Updated {fmtDate(c.updated_at)}</span>
      </div>
      <div className="card-row-actions">
        <label className="switch" title={c.is_active ? 'Live: anyone with the link can see it' : 'Off: the link shows “not found”'}>
          <input type="checkbox" checked={c.is_active} onChange={() => onToggle(c)} />
          <span /> {c.is_active ? 'Live' : 'Off'}
        </label>
        <button className="icon-btn" onClick={copy} aria-label="Copy link"><Icon name="copy" size={17} /></button>
        <button className="icon-btn" onClick={() => onQr(link)} aria-label="QR code"><Icon name="qr" size={17} /></button>
        <Link to={`/nfc?id=${c.id}`} className="icon-btn" aria-label="NFC card"><Icon name="nfc" size={17} /></Link>
        <Link to={`/create?card=${c.id}`} className="icon-btn" aria-label="Edit"><Icon name="edit" size={17} /></Link>
        <button className="icon-btn danger" onClick={() => onDelete(c)} aria-label="Delete"><Icon name="trash" size={17} /></button>
      </div>
    </div>
  )
}

function Account({ showToast }) {
  const { user, profile } = useAuth()
  const [name, setName] = useState(profile?.full_name || '')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState('')
  const recovering = new URLSearchParams(window.location.search).get('tab') === 'account'

  const saveName = async (e) => {
    e.preventDefault()
    setBusy('name')
    try {
      await must(supabase.from('profiles').update({ full_name: name.trim().slice(0, 80) }).eq('id', user.id))
      await refreshProfile()
      showToast('Name saved')
    } catch (err) {
      showToast(err.message)
    }
    setBusy('')
  }
  const savePw = async (e) => {
    e.preventDefault()
    setBusy('pw')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy('')
    if (error) return showToast(error.message)
    setPw('')
    showToast('Password updated')
  }

  return (
    <div className="panel" id="account">
      <div className="panel-head">
        <h2>Account</h2>
        <span className="muted small">{user.email}{profile?.role === 'admin' ? ' · Admin' : ''}</span>
      </div>
      <div className="grid-2">
        <form className="inline-form" onSubmit={saveName}>
          <label className="field">
            <span className="field-label">Display name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Your name" />
          </label>
          <button className="btn btn-outline btn-sm" disabled={busy === 'name'}>Save</button>
        </form>
        <form className="inline-form" onSubmit={savePw}>
          <label className="field">
            <span className="field-label">{recovering ? 'Choose a new password' : 'New password'}</span>
            <input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
          </label>
          <button className="btn btn-outline btn-sm" disabled={busy === 'pw'}>Update</button>
        </form>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [cards, setCards] = useState(null)
  const [daily, setDaily] = useState(null)
  const [qr, setQr] = useState('')
  const [toast, showToast] = useToast()

  const load = useCallback(async () => {
    try {
      // A card published from this browser before signing in joins the account.
      const pub = loadPub()
      if (pub?.id && pub?.token) await rpc('claim_card', { p_id: pub.id, p_token: pub.token }).catch(() => {})
      const [rows, days] = await Promise.all([
        must(supabase.from('cards').select('id, name, data, is_active, view_count, created_at, updated_at').eq('owner_id', user.id).order('updated_at', { ascending: false })),
        rpc('card_views_daily', { p_days: 30 }),
      ])
      setCards(rows)
      setDaily(days)
    } catch (e) {
      showToast(e.message)
      setCards([])
      setDaily([])
    }
  }, [user, showToast])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  useEffect(() => {
    if (cards && new URLSearchParams(window.location.search).get('tab') === 'account') document.getElementById('account')?.scrollIntoView({ behavior: 'smooth' })
  }, [cards])

  const onToggle = async (c) => {
    setCards((cs) => cs.map((x) => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)))
    try {
      await must(supabase.from('cards').update({ is_active: !c.is_active }).eq('id', c.id))
      showToast(c.is_active ? 'Card turned off' : 'Card is live')
    } catch (e) {
      showToast(e.message)
      load()
    }
  }
  const onDelete = async (c) => {
    if (!window.confirm(`Delete “${c.name}”? Its link, QR code and NFC card will stop working. This can’t be undone.`)) return
    try {
      await must(supabase.from('cards').delete().eq('id', c.id))
      setCards((cs) => cs.filter((x) => x.id !== c.id))
      showToast('Card deleted')
    } catch (e) {
      showToast(e.message)
    }
  }

  const views = cards?.reduce((s, c) => s + c.view_count, 0)
  const week = daily?.slice(-7).reduce((s, d) => s + Number(d.views), 0)
  const first = (profile?.full_name || '').split(' ')[0]

  return (
    <DashShell
      title={first ? `Hi, ${first}` : 'Your cards'}
      actions={
        <Link to="/create?new" className="btn btn-lime">
          <Icon name="plus" size={18} /> New card
        </Link>
      }
    >
      {user && (
        <>
          <div className="stat-row">
            <StatTile icon="card" label="Cards" value={cards ? fmtNum(cards.length) : null} sub={cards ? `${cards.filter((c) => c.is_active).length} live` : ''} />
            <StatTile icon="eye" label="Total views" value={cards ? fmtNum(views) : null} />
            <StatTile icon="chart" label="Views, last 7 days" value={daily ? fmtNum(week) : null} />
          </div>
          <ViewsChart data={daily} />
          <div className="panel">
            <div className="panel-head">
              <h2>My cards</h2>
              {cards?.length > 0 && <span className="pill-count">{cards.length}</span>}
            </div>
            {!cards && <div className="bc-skeleton row-skeleton" />}
            {cards?.length === 0 && (
              <div className="dash-empty">
                <span className="missing-icon"><Icon name="card" size={26} /></span>
                <h3>No cards yet</h3>
                <p className="muted">Create your first card. It gets a permanent link you can share, put in a QR code or write to an NFC card.</p>
                <Link to="/create?new" className="btn btn-dark">Create a card <Icon name="arrow" size={18} /></Link>
              </div>
            )}
            {cards?.map((c) => (
              <CardRow key={c.id} c={c} onToggle={onToggle} onDelete={onDelete} onQr={setQr} showToast={showToast} />
            ))}
          </div>
          <Account showToast={showToast} />
        </>
      )}
      {qr && <QRModal url={qr} name="" onClose={() => setQr('')} />}
      {toast}
    </DashShell>
  )
}
