import { useCallback, useEffect, useMemo, useState } from 'react'
import DashShell, { StatTile, fmtDate, fmtNum } from '../components/DashShell.jsx'
import ViewsChart from '../components/ViewsChart.jsx'
import QRModal from '../components/QRModal.jsx'
import Icon from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAuth, must } from '../auth.js'
import { supabase, rpc } from '../supabase.js'
import { CardRow } from './Dashboard.jsx'

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'cards', label: 'Cards' },
  { key: 'messages', label: 'Messages' },
]

function Users({ users, me, onRole, onComp }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (users || []).filter((u) => !s || u.email.toLowerCase().includes(s) || u.full_name.toLowerCase().includes(s))
  }, [users, q])
  return (
    <>
      <Search value={q} onChange={setQ} placeholder="Search by name or email" />
      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Plan</th>
              <th className="num">Cards</th>
              <th className="num">Views</th>
              <th className="num">Wallet</th>
              <th>Joined</th>
              <th>Last sign-in</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td>
                  <b>{u.full_name || '–'}</b>
                  <span className="muted small block">{u.email}</span>
                </td>
                <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                <td><PlanBadge u={u} /></td>
                <td className="num">{fmtNum(u.card_count)}</td>
                <td className="num">{fmtNum(u.view_count)}</td>
                <td className="num">{fmtNum(u.contact_count)}</td>
                <td>{fmtDate(u.created_at)}</td>
                <td>{fmtDate(u.last_sign_in_at)}</td>
                <td className="right">
                  {u.role !== 'admin' && (
                    <button className="link-btn" onClick={() => onComp(u, !u.comped)}>
                      {u.comped ? 'Remove free Pro' : 'Give free Pro'}
                    </button>
                  )}
                  {u.id !== me && (
                    <button className="link-btn" onClick={() => onRole(u, u.role === 'admin' ? 'user' : 'admin')}>
                      {u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users && list.length === 0 && (
              <tr><td colSpan={9} className="muted center">No users match.</td></tr>
            )}
          </tbody>
        </table>
        {!users && <div className="bc-skeleton row-skeleton" />}
      </div>
    </>
  )
}

const PAYING = ['active', 'trialing', 'past_due']
function PlanBadge({ u }) {
  if (u.role === 'admin') return <span className="role-badge">Included</span>
  if (u.comped) return <span className="role-badge pro">Pro (free)</span>
  if (PAYING.includes(u.sub_status))
    return (
      <span className={`role-badge ${u.sub_status === 'past_due' ? 'warn' : 'pro'}`} title={`Renews ${fmtDate(u.sub_period_end)}`}>
        Pro {u.sub_interval === 'year' ? 'yearly' : 'monthly'}{u.sub_status === 'past_due' ? ' · past due' : ''}
      </span>
    )
  return <span className="role-badge">Free</span>
}

function Search({ value, onChange, placeholder }) {
  return (
    <label className="dash-search">
      <Icon name="search" size={16} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  )
}

function Messages({ messages, onStatus, onDelete }) {
  const [filter, setFilter] = useState('open')
  const list = (messages || []).filter((m) => (filter === 'open' ? m.status !== 'archived' : m.status === 'archived'))
  return (
    <>
      <div className="topic-chips">
        {['open', 'archived'].map((f) => (
          <button key={f} className={`topic ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'open' ? 'Inbox' : 'Archived'}
          </button>
        ))}
      </div>
      {!messages && <div className="bc-skeleton row-skeleton" />}
      {messages && list.length === 0 && <p className="muted center pad">Nothing here.</p>}
      <div className="msg-list">
        {list.map((m) => (
          <article key={m.id} className={`msg ${m.status}`}>
            <header>
              <div>
                <b>{m.name}</b> <a className="inline-link small" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.topic || 'your message'}`)}`}>{m.email}</a>
                <span className="muted small block">{m.topic} · {new Date(m.created_at).toLocaleString()}</span>
              </div>
              {m.status === 'new' && <span className="role-badge new">New</span>}
            </header>
            <p>{m.message}</p>
            <footer>
              <a className="btn btn-dark btn-sm" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.topic || 'your message'}`)}`} onClick={() => m.status === 'new' && onStatus(m, 'read')}>
                <Icon name="send" size={15} /> Reply
              </a>
              {m.status === 'new' && <button className="btn btn-outline btn-sm" onClick={() => onStatus(m, 'read')}>Mark read</button>}
              {m.status !== 'archived' ? (
                <button className="btn btn-outline btn-sm" onClick={() => onStatus(m, 'archived')}>Archive</button>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={() => onStatus(m, 'read')}>Move to inbox</button>
              )}
              <button className="btn btn-ghost btn-sm danger-text" onClick={() => onDelete(m)}>Delete</button>
            </footer>
          </article>
        ))}
      </div>
    </>
  )
}

export default function Admin() {
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [tab, setTab] = useState('users')
  const [stats, setStats] = useState(null)
  const [daily, setDaily] = useState(null)
  const [users, setUsers] = useState(null)
  const [cards, setCards] = useState(null)
  const [messages, setMessages] = useState(null)
  const [cardQ, setCardQ] = useState('')
  const [qr, setQr] = useState('')
  const [toast, showToast] = useToast()

  const load = useCallback(async () => {
    try {
      const [s, d, u, c, m] = await Promise.all([
        rpc('admin_stats'),
        rpc('card_views_daily', { p_days: 30 }),
        rpc('admin_list_users'),
        must(supabase.from('cards').select('id, name, data, is_active, view_count, created_at, updated_at, owner:profiles(email)').order('updated_at', { ascending: false }).limit(500)),
        must(supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(500)),
      ])
      setStats(s)
      setDaily(d)
      setUsers(u)
      setCards(c)
      setMessages(m)
    } catch (e) {
      showToast(e.message)
    }
  }, [showToast])

  useEffect(() => {
    if (user && isAdmin) load()
  }, [user, isAdmin, load])

  const onRole = async (u, role) => {
    if (!window.confirm(role === 'admin' ? `Give ${u.email} full admin access?` : `Remove admin access from ${u.email}?`)) return
    try {
      await rpc('admin_set_role', { p_user_id: u.id, p_role: role })
      setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, role } : x)))
      showToast('Role updated')
    } catch (e) {
      showToast(e.message)
    }
  }
  const onComp = async (u, comped) => {
    if (!window.confirm(comped ? `Give ${u.email} digibiz Pro for free?` : `Remove free Pro from ${u.email}? Their cards go offline unless they subscribe.`)) return
    try {
      await rpc('admin_set_comped', { p_user_id: u.id, p_comped: comped })
      setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, comped } : x)))
      showToast(comped ? 'Pro given' : 'Free Pro removed')
    } catch (e) {
      showToast(e.message)
    }
  }
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
  const onDeleteCard = async (c) => {
    if (!window.confirm(`Delete “${c.name}” (${c.id})? Its link stops working for everyone. This can’t be undone.`)) return
    try {
      await must(supabase.from('cards').delete().eq('id', c.id))
      setCards((cs) => cs.filter((x) => x.id !== c.id))
      showToast('Card deleted')
    } catch (e) {
      showToast(e.message)
    }
  }
  const onStatus = async (m, status) => {
    setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, status } : x)))
    try {
      await must(supabase.from('contact_messages').update({ status }).eq('id', m.id))
      setStats((s) => s && { ...s, messages_new: Math.max(0, s.messages_new - (m.status === 'new' ? 1 : 0)) })
    } catch (e) {
      showToast(e.message)
      load()
    }
  }
  const onDeleteMsg = async (m) => {
    if (!window.confirm(`Delete the message from ${m.name}?`)) return
    try {
      await must(supabase.from('contact_messages').delete().eq('id', m.id))
      setMessages((ms) => ms.filter((x) => x.id !== m.id))
    } catch (e) {
      showToast(e.message)
    }
  }

  const shownCards = useMemo(() => {
    const s = cardQ.trim().toLowerCase()
    return (cards || []).filter((c) => !s || (c.name || '').toLowerCase().includes(s) || c.id.includes(s) || (c.owner?.email || '').toLowerCase().includes(s))
  }, [cards, cardQ])

  const counts = { users: users?.length, cards: cards?.length, messages: stats?.messages_new }

  return (
    <DashShell
      title="Admin dashboard"
      admin
      actions={
        <button className="btn btn-outline" onClick={load}>
          <Icon name="bolt" size={16} /> Refresh
        </button>
      }
    >
      <div className="stat-row five">
        <StatTile icon="user" label="Users" value={stats && fmtNum(stats.users)} sub={stats && `+${fmtNum(stats.users_7d)} this week`} />
        <StatTile icon="bolt" label="Pro members" value={stats && fmtNum(stats.pro)} sub={stats && `${fmtNum(stats.pro_paying)} paying · ~$${fmtNum(stats.mrr)}/mo`} />
        <StatTile icon="card" label="Cards" value={stats && fmtNum(stats.cards)} sub={stats && `${fmtNum(stats.cards_active)} live · ${fmtNum(stats.contacts)} in wallets`} />
        <StatTile icon="eye" label="Card views" value={stats && fmtNum(stats.views)} sub={stats && `${fmtNum(stats.views_7d)} this week`} />
        <StatTile icon="mail" label="New messages" value={stats && fmtNum(stats.messages_new)} />
      </div>
      <ViewsChart data={daily} title="All card views, last 30 days" />
      <div className="panel">
        <div className="seg-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
              {t.label}
              {counts[t.key] > 0 && <span className="seg-count">{counts[t.key]}</span>}
            </button>
          ))}
        </div>
        {tab === 'users' && <Users users={users} me={user?.id} onRole={onRole} onComp={onComp} />}
        {tab === 'cards' && (
          <>
            <Search value={cardQ} onChange={setCardQ} placeholder="Search by name, link id or owner email" />
            {!cards && <div className="bc-skeleton row-skeleton" />}
            {cards && shownCards.length === 0 && <p className="muted center pad">No cards match.</p>}
            {shownCards.map((c) => (
              <CardRow key={c.id} c={c} owner={c.owner?.email || ''} onToggle={onToggle} onDelete={onDeleteCard} onQr={setQr} showToast={showToast} />
            ))}
          </>
        )}
        {tab === 'messages' && <Messages messages={messages} onStatus={onStatus} onDelete={onDeleteMsg} />}
      </div>
      {qr && <QRModal url={qr} name="" onClose={() => setQr('')} />}
      {toast}
    </DashShell>
  )
}
