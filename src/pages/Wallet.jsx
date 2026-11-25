import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DashShell, { fmtDate } from '../components/DashShell.jsx'
import Icon from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAuth, must } from '../auth.js'
import { supabase } from '../supabase.js'
import { initials, websiteUrl } from '../lib.js'
import {
  EMPTY_CONTACT, FIELDS, contactToVCard, contactsToCsv, download, normTag,
  removePhotos, shrinkPhoto, signedUrls, uploadPhoto,
} from '../wallet.js'

function PhotoSlot({ label, url, onPick, onRemove, busy }) {
  const input = useRef(null)
  return (
    <div className="photo-slot">
      <button type="button" className={`photo-box ${url ? 'has' : ''}`} onClick={() => input.current?.click()} disabled={busy}>
        {url ? <img src={url} alt={label} /> : (
          <span className="photo-empty">
            <Icon name="upload" size={22} />
            <b>{label}</b>
            <small>Take or upload a photo</small>
          </span>
        )}
        {busy && <span className="photo-busy"><span className="spinner" /></span>}
      </button>
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f) }} />
      {url && (
        <div className="photo-actions">
          <button type="button" className="link-btn" onClick={() => input.current?.click()}>Replace</button>
          <button type="button" className="link-btn danger" onClick={onRemove}>Remove</button>
        </div>
      )}
    </div>
  )
}

function TagInput({ tags, onChange, suggestions }) {
  const [text, setText] = useState('')
  const add = (raw) => {
    const t = normTag(raw)
    if (t && !tags.includes(t) && tags.length < 20) onChange([...tags, t])
    setText('')
  }
  return (
    <div className="tag-input">
      {tags.map((t) => (
        <span key={t} className="tag">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}><Icon name="close" size={12} /></button>
        </span>
      ))}
      <input
        value={text}
        list="tag-suggestions"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text) }
          else if (e.key === 'Backspace' && !text && tags.length) onChange(tags.slice(0, -1))
        }}
        onBlur={() => text && add(text)}
        placeholder={tags.length ? 'Add tag' : 'e.g. client, conference'}
        aria-label="Tags"
      />
      <datalist id="tag-suggestions">
        {suggestions.filter((s) => !tags.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  )
}

function ContactModal({ contact, urls, userId, allTags, onClose, onSaved, onDeleted, showToast }) {
  const isNew = !contact.id
  const [c, setC] = useState(() => ({ ...EMPTY_CONTACT, ...contact, met_on: contact.met_on || '', tags: contact.tags || [] }))
  const [preview, setPreview] = useState({ front: urls[contact.front_path], back: urls[contact.back_path] })
  const [uploading, setUploading] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(isNew)
  const uploaded = useRef([]) // photos added in this session, removed again if the user cancels
  const replaced = useRef([]) // old photos to delete after a successful save
  const set = (k) => (e) => setC((x) => ({ ...x, [k]: e.target.value }))

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && cancel()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pick = (side) => async (file) => {
    setUploading(side)
    try {
      const blob = await shrinkPhoto(file)
      const path = await uploadPhoto(userId, blob, side)
      uploaded.current.push(path)
      const old = c[`${side}_path`]
      if (old) replaced.current.push(old)
      setC((x) => ({ ...x, [`${side}_path`]: path }))
      setPreview((p) => ({ ...p, [side]: URL.createObjectURL(blob) }))
    } catch (e) {
      showToast(e.message)
    }
    setUploading('')
  }
  const unpick = (side) => () => {
    const old = c[`${side}_path`]
    if (old) replaced.current.push(old)
    setC((x) => ({ ...x, [`${side}_path`]: null }))
    setPreview((p) => ({ ...p, [side]: null }))
  }

  const cancel = () => {
    removePhotos(uploaded.current)
    onClose()
  }

  const save = async (e) => {
    e?.preventDefault()
    if (!c.name.trim()) return showToast('Add a name')
    setSaving(true)
    try {
      const row = Object.fromEntries(FIELDS.map((k) => [k, typeof c[k] === 'string' ? c[k].trim() : c[k]]))
      row.met_on = row.met_on || null
      const saved = isNew
        ? await must(supabase.from('saved_contacts').insert(row).select().single())
        : await must(supabase.from('saved_contacts').update(row).eq('id', c.id).select().single())
      await removePhotos(replaced.current.filter((p) => p !== saved.front_path && p !== saved.back_path))
      onSaved(saved, { [saved.front_path]: preview.front, [saved.back_path]: preview.back })
      showToast(isNew ? 'Card saved to your wallet' : 'Changes saved')
    } catch (err) {
      showToast(err.message)
      setSaving(false)
    }
  }

  const del = async () => {
    if (!window.confirm(`Delete ${c.name || 'this contact'} from your wallet? Photos are deleted too.`)) return
    try {
      await must(supabase.from('saved_contacts').delete().eq('id', c.id))
      await removePhotos([c.front_path, c.back_path, ...uploaded.current, ...replaced.current])
      onDeleted(c.id)
      showToast('Deleted')
    } catch (err) {
      showToast(err.message)
    }
  }

  return (
    <div className="sheet-back" onMouseDown={(e) => e.target === e.currentTarget && cancel()}>
      <form className="sheet" onSubmit={save} role="dialog" aria-modal="true" aria-label={isNew ? 'Add a business card' : c.name}>
        <div className="sheet-head">
          <h2>{isNew ? 'Add a business card' : editing ? 'Edit card' : c.name}</h2>
          <button type="button" className="icon-btn" onClick={cancel} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>

        <div className="photo-row">
          {editing ? (
            <>
              <PhotoSlot label="Front" url={preview.front} busy={uploading === 'front'} onPick={pick('front')} onRemove={unpick('front')} />
              <PhotoSlot label="Back" url={preview.back} busy={uploading === 'back'} onPick={pick('back')} onRemove={unpick('back')} />
            </>
          ) : (
            ['front', 'back'].filter((s) => preview[s]).map((s) => (
              <a key={s} className="photo-box has" href={preview[s]} target="_blank" rel="noreferrer"><img src={preview[s]} alt={s} /></a>
            ))
          )}
        </div>

        {editing ? (
          <div className="sheet-body">
            <div className="grid-2">
              <label className="field"><span className="field-label">Name *</span><input required value={c.name} onChange={set('name')} maxLength={100} placeholder="Jane Smith" autoFocus={isNew} /></label>
              <label className="field"><span className="field-label">Job title</span><input value={c.title} onChange={set('title')} maxLength={100} placeholder="Head of Sales" /></label>
              <label className="field"><span className="field-label">Company</span><input value={c.company} onChange={set('company')} maxLength={100} placeholder="Acme Ltd" /></label>
              <label className="field"><span className="field-label">Phone</span><input type="tel" value={c.phone} onChange={set('phone')} maxLength={60} placeholder="+1 416 555 0100" /></label>
              <label className="field"><span className="field-label">Email</span><input type="email" value={c.email} onChange={set('email')} maxLength={200} placeholder="jane@acme.com" /></label>
              <label className="field"><span className="field-label">Website</span><input value={c.website} onChange={set('website')} maxLength={200} placeholder="acme.com" /></label>
            </div>
            <label className="field"><span className="field-label">Address</span><input value={c.address} onChange={set('address')} maxLength={300} placeholder="Street, city" /></label>
            <div className="grid-2">
              <label className="field"><span className="field-label">Where you met</span><input value={c.met_where} onChange={set('met_where')} maxLength={200} placeholder="Tech Expo 2026" /></label>
              <label className="field"><span className="field-label">When</span><input type="date" value={c.met_on} onChange={set('met_on')} /></label>
            </div>
            <div className="field"><span className="field-label">Tags</span><TagInput tags={c.tags} onChange={(tags) => setC((x) => ({ ...x, tags }))} suggestions={allTags} /></div>
            <label className="field"><span className="field-label">Notes</span><textarea rows={3} value={c.notes} onChange={set('notes')} maxLength={4000} placeholder="What you talked about, follow-ups…" /></label>
            <label className="check-row"><input type="checkbox" checked={c.favorite} onChange={(e) => setC((x) => ({ ...x, favorite: e.target.checked }))} /> Favourite</label>
          </div>
        ) : (
          <div className="sheet-body contact-view">
            {(c.title || c.company) && <p className="muted">{[c.title, c.company].filter(Boolean).join(' · ')}</p>}
            <div className="contact-links">
              {c.phone && <a className="btn btn-outline btn-sm" href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}><Icon name="phone" size={15} /> {c.phone}</a>}
              {c.email && <a className="btn btn-outline btn-sm" href={`mailto:${c.email}`}><Icon name="mail" size={15} /> {c.email}</a>}
              {c.website && <a className="btn btn-outline btn-sm" href={websiteUrl(c.website)} target="_blank" rel="noreferrer"><Icon name="globe" size={15} /> {c.website}</a>}
              {c.address && <a className="btn btn-outline btn-sm" href={`https://maps.google.com/?q=${encodeURIComponent(c.address)}`} target="_blank" rel="noreferrer"><Icon name="pin" size={15} /> {c.address}</a>}
            </div>
            {(c.met_where || c.met_on) && <p className="small"><b>Met</b> {[c.met_where, c.met_on && fmtDate(c.met_on)].filter(Boolean).join(', ')}</p>}
            {c.tags.length > 0 && <div className="tag-list">{c.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
            {c.notes && <p className="contact-notes">{c.notes}</p>}
          </div>
        )}

        <div className="sheet-foot">
          {!isNew && <button type="button" className="btn btn-ghost btn-sm danger-text" onClick={del}><Icon name="trash" size={15} /> Delete</button>}
          <span className="spacer" />
          {editing ? (
            <>
              <button key="cancel" type="button" className="btn btn-outline" onClick={isNew ? cancel : () => setEditing(false)}>Cancel</button>
              <button key="save" type="submit" className="btn btn-dark" disabled={saving || !!uploading}>{saving ? 'Saving…' : 'Save'}</button>
            </>
          ) : (
            <>
              {/* distinct keys: React must not reuse these as the submit button */}
              <button key="vcf" type="button" className="btn btn-outline" onClick={() => download(`${c.name.replace(/[^\w-]+/g, '_') || 'contact'}.vcf`, contactToVCard(c), 'text/vcard;charset=utf-8')}>
                <Icon name="download" size={15} /> Save to phone
              </button>
              <button key="edit" type="button" className="btn btn-dark" onClick={(e) => { e.preventDefault(); setEditing(true) }}><Icon name="edit" size={15} /> Edit</button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}

export default function Wallet() {
  const { user } = useAuth()
  const [list, setList] = useState(null)
  const [urls, setUrls] = useState({})
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')
  const [open, setOpen] = useState(null)
  const [toast, showToast] = useToast()

  const load = useCallback(async () => {
    try {
      const rows = await must(supabase.from('saved_contacts').select('*').order('favorite', { ascending: false }).order('updated_at', { ascending: false }))
      setList(rows)
      setUrls(await signedUrls(rows.map((r) => r.front_path)))
    } catch (e) {
      showToast(e.message)
      setList([])
    }
  }, [showToast])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  const allTags = useMemo(() => [...new Set((list || []).flatMap((c) => c.tags))].sort(), [list])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (list || []).filter((c) =>
      (!tag || (tag === '★' ? c.favorite : c.tags.includes(tag))) &&
      (!s || [c.name, c.company, c.title, c.email, c.phone, c.notes, c.met_where, ...c.tags].some((v) => (v || '').toLowerCase().includes(s))))
  }, [list, q, tag])

  const openContact = async (c) => {
    const need = [c.front_path, c.back_path].filter((p) => p && !urls[p])
    if (need.length) {
      try {
        const more = await signedUrls(need)
        setUrls((u) => ({ ...u, ...more }))
        return setOpen({ c, urls: { ...urls, ...more } })
      } catch {
        /* show without photos */
      }
    }
    setOpen({ c, urls })
  }

  const onSaved = (row, localUrls) => {
    setList((l) => {
      const rest = (l || []).filter((x) => x.id !== row.id)
      return [row, ...rest].sort((a, b) => Number(b.favorite) - Number(a.favorite))
    })
    setUrls((u) => ({ ...u, ...Object.fromEntries(Object.entries(localUrls).filter(([k, v]) => k && k !== 'null' && v)) }))
    setOpen(null)
  }

  const exportAll = (kind) => {
    if (!shown.length) return showToast('Nothing to export')
    const stamp = new Date().toISOString().slice(0, 10)
    if (kind === 'vcf') download(`digibiz-contacts-${stamp}.vcf`, shown.map(contactToVCard).join('\r\n'), 'text/vcard;charset=utf-8')
    else download(`digibiz-contacts-${stamp}.csv`, '﻿' + contactsToCsv(shown), 'text/csv;charset=utf-8')
  }

  return (
    <DashShell
      title="Card wallet"
      actions={
        <button className="btn btn-lime" onClick={() => setOpen({ c: { ...EMPTY_CONTACT }, urls: {} })}>
          <Icon name="plus" size={18} /> Add a card
        </button>
      }
    >
      {user && (
        <div className="panel">
          <div className="wallet-tools">
            <label className="dash-search">
              <Icon name="search" size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names, companies, notes, tags" aria-label="Search wallet" />
            </label>
            <div className="wallet-export">
              <button className="btn btn-outline btn-sm" onClick={() => exportAll('vcf')}><Icon name="download" size={15} /> vCard</button>
              <button className="btn btn-outline btn-sm" onClick={() => exportAll('csv')}><Icon name="download" size={15} /> CSV</button>
            </div>
          </div>
          {(allTags.length > 0 || list?.some((c) => c.favorite)) && (
            <div className="topic-chips">
              <button className={`topic ${!tag ? 'on' : ''}`} onClick={() => setTag('')}>All {list && <span className="chip-count">{list.length}</span>}</button>
              {list?.some((c) => c.favorite) && <button className={`topic ${tag === '★' ? 'on' : ''}`} onClick={() => setTag(tag === '★' ? '' : '★')}>★ Favourites</button>}
              {allTags.map((t) => (
                <button key={t} className={`topic ${tag === t ? 'on' : ''}`} onClick={() => setTag(tag === t ? '' : t)}>{t}</button>
              ))}
            </div>
          )}

          {!list && <div className="bc-skeleton row-skeleton" />}
          {list?.length === 0 && (
            <div className="dash-empty">
              <span className="missing-icon"><Icon name="card" size={26} /></span>
              <h3>Your wallet is empty</h3>
              <p className="muted">Snap a photo of every business card you’re handed, add a note about where you met, and find anyone again in seconds. Free, with no limit.</p>
              <button className="btn btn-dark" onClick={() => setOpen({ c: { ...EMPTY_CONTACT }, urls: {} })}><Icon name="plus" size={18} /> Add your first card</button>
            </div>
          )}
          {list?.length > 0 && shown.length === 0 && <p className="muted center pad">No cards match.</p>}
          <div className="wallet-grid">
            {shown.map((c) => (
              <button key={c.id} className="wallet-item" onClick={() => openContact(c)}>
                <span className="wallet-thumb">
                  {urls[c.front_path] ? <img src={urls[c.front_path]} alt="" loading="lazy" /> : <span className="wallet-initials">{initials(c.name)}</span>}
                  {c.favorite && <span className="wallet-fav" aria-label="Favourite">★</span>}
                </span>
                <span className="wallet-info">
                  <b>{c.name}</b>
                  <span className="muted">{[c.title, c.company].filter(Boolean).join(' · ') || c.email || c.phone || ' '}</span>
                  {c.tags.length > 0 && <span className="tag-list">{c.tags.slice(0, 3).map((t) => <span key={t} className="tag">{t}</span>)}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {open && (
        <ContactModal
          key={open.c.id || 'new'}
          contact={open.c}
          urls={open.urls}
          userId={user.id}
          allTags={allTags}
          onClose={() => setOpen(null)}
          onSaved={onSaved}
          onDeleted={(id) => { setList((l) => l.filter((x) => x.id !== id)); setOpen(null) }}
          showToast={showToast}
        />
      )}
      {toast}
    </DashShell>
  )
}
