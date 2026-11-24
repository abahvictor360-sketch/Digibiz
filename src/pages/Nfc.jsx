import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import Logo from '../components/Logo.jsx'
import Icon from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'
import { Link } from '../router.jsx'
import { usePublish } from '../usePublish.js'
import { useInstall, isStandalone } from '../useInstall.js'
import { PublishStatus } from './Editor.jsx'
import { SAMPLE_CARD, cardLink, fetchCard, loadDraft } from '../lib.js'
import { downloadFace, renderFace } from '../printCard.js'

const hasWebNfc = typeof window !== 'undefined' && 'NDEFReader' in window
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)
const isAndroid = /Android/.test(ua)

// NDEF size of a URL record: header + URI prefix byte + rest of the URL.
function ndefBytes(url) {
  const body = url.replace(/^https:\/\/(www\.)?/, '')
  return 7 + 1 + new TextEncoder().encode(body).length
}

function useFaces(card, url) {
  const [faces, setFaces] = useState({ front: '', back: '' })
  useEffect(() => {
    if (!card || !url) return
    let alive = true
    Promise.all([renderFace('front', card, url), renderFace('back', card, url)]).then(([f, b]) => {
      if (alive) setFaces({ front: f.toDataURL('image/png'), back: b.toDataURL('image/png') })
    })
    return () => {
      alive = false
    }
  }, [card, url])
  return faces
}

function NfcWriter({ url, onDone }) {
  const [state, setState] = useState({ phase: 'idle', msg: '' })
  const abort = useRef(null)

  useEffect(() => () => abort.current?.abort(), [])

  const write = async () => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    const timer = setTimeout(() => ctrl.abort(), 30000)
    setState({ phase: 'waiting', msg: '' })
    try {
      const ndef = new window.NDEFReader()
      await ndef.write({ records: [{ recordType: 'url', data: url }] }, { overwrite: true, signal: ctrl.signal })
      setState({ phase: 'done', msg: '' })
      onDone?.()
    } catch (e) {
      const msg =
        e.name === 'AbortError' ? 'Timed out — no NFC card was detected. Try again and hold the card still.'
        : e.name === 'NotAllowedError' ? 'NFC permission was blocked. Allow NFC for this site in Chrome settings, then try again.'
        : e.name === 'NotSupportedError' ? 'NFC is turned off or unavailable. Turn on NFC in your phone settings.'
        : e.name === 'NetworkError' ? 'The card moved before writing finished, or it’s locked. Hold it still and try again.'
        : e.message || 'Could not write to the card.'
      setState({ phase: 'error', msg })
    } finally {
      clearTimeout(timer)
    }
  }

  const check = async () => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setState({ phase: 'reading', msg: '' })
    try {
      const ndef = new window.NDEFReader()
      await ndef.scan({ signal: ctrl.signal })
      ndef.onreading = (ev) => {
        const rec = ev.message.records.find((r) => r.recordType === 'url' || r.recordType === 'absolute-url')
        const found = rec ? new TextDecoder().decode(rec.data) : ''
        ctrl.abort()
        if (!found) setState({ phase: 'checked', msg: 'This card has no link on it yet.' })
        else if (found === url) setState({ phase: 'checked', ok: true, msg: 'This card opens your digibiz card.' })
        else setState({ phase: 'checked', msg: `This card opens a different link: ${found}` })
      }
      ndef.onreadingerror = () => setState({ phase: 'checked', msg: 'Couldn’t read that card. It may be blank or unformatted — try writing to it.' })
    } catch (e) {
      setState({ phase: 'error', msg: e.message || 'Could not start NFC.' })
    }
  }

  return (
    <div className="nfc-writer">
      <div className={`nfc-pulse ${state.phase === 'waiting' || state.phase === 'reading' ? 'active' : ''} ${state.phase === 'done' ? 'done' : ''}`}>
        <span className="nfc-pulse-ring" />
        <span className="nfc-pulse-ring r2" />
        <span className="nfc-pulse-core">
          <Icon name={state.phase === 'done' ? 'check' : 'nfc'} size={34} stroke={2.2} />
        </span>
      </div>
      <p className="nfc-msg" role="status" aria-live="polite">
        {state.phase === 'idle' && 'Press the button, then hold a blank NFC card flat against the back of your phone.'}
        {state.phase === 'waiting' && 'Hold the NFC card against the back of your phone…'}
        {state.phase === 'reading' && 'Hold any NFC card against your phone to check what’s on it…'}
        {state.phase === 'done' && 'Done! Your NFC card now opens your digibiz card. Tap it on any phone to test.'}
        {(state.phase === 'error' || state.phase === 'checked') && <span className={state.ok ? 'ok' : state.phase === 'error' ? 'err' : ''}>{state.msg}</span>}
      </p>
      <div className="nfc-buttons">
        <button className="btn btn-dark btn-lg" onClick={write} disabled={state.phase === 'waiting'}>
          <Icon name="nfc" size={20} /> {state.phase === 'done' ? 'Write another card' : 'Write to NFC card'}
        </button>
        <button className="btn btn-outline btn-lg" onClick={check} disabled={state.phase === 'reading'}>
          Check a card
        </button>
      </div>
    </div>
  )
}

export default function Nfc() {
  const paramId = new URLSearchParams(window.location.search).get('id') || ''
  const [draft] = useState(() => loadDraft() || { ...SAMPLE_CARD, socials: { ...SAMPLE_CARD.socials } })
  const [remote, setRemote] = useState(null)
  const [toast, showToast] = useToast()
  const { pub, dirty, busy, error, publish, clearError } = usePublish(draft)
  const [handoffQr, setHandoffQr] = useState('')
  const [side, setSide] = useState('front')
  const install = useInstall()
  const standalone = isStandalone()

  // ?id= mode: writing an existing card's link (e.g. opened on a phone from the desktop QR).
  useEffect(() => {
    if (!paramId) return
    fetchCard(paramId).then(setRemote).catch(() => showToast('Couldn’t load that card'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramId])

  useEffect(() => {
    if (error) showToast(error)
    clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  useEffect(() => {
    document.title = 'NFC card — digibiz'
    return () => (document.title = 'digibiz — Smart Digital Business Cards')
  }, [])

  const card = paramId ? remote : draft
  const id = paramId || pub?.id || ''
  const url = id ? cardLink(id) : ''
  const faces = useFaces(card, url)

  useEffect(() => {
    if (!id || hasWebNfc) return
    QRCode.toDataURL(`${window.location.origin}/nfc?id=${id}`, { width: 360, margin: 1 }).then(setHandoffQr)
  }, [id])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied')
    } catch {
      window.prompt('Copy your card link', url)
    }
  }

  const bytes = url ? ndefBytes(url) : 0

  return (
    <div className="editor-page nfc-page">
      <header className="editor-bar">
        <Logo />
        <div className="editor-bar-actions">
          <Link to="/create" className="btn btn-ghost">
            <Icon name="arrowLeft" size={18} /> <span className="hide-xs">Back to editor</span>
          </Link>
        </div>
      </header>

      <main className="nfc-main">
        <section className="nfc-hero">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Physical NFC card
          </span>
          <h1>
            Tap. <span className="ul">Connected.</span>
          </h1>
          <p className="lead">Put your digibiz link on a real NFC card. Anyone taps it with their phone and your card opens instantly — no app needed. Your link never changes, so you never have to rewrite the card.</p>
        </section>

        {/* Step 1 — link */}
        <section className="panel nfc-step">
          <div className="step-badge">1</div>
          <div className="nfc-step-body">
            <h2>Your permanent link</h2>
            {!paramId && (
              <div className="nfc-pubrow">
                <PublishStatus pub={pub} dirty={dirty} busy={busy} />
                {(!pub || dirty) && (
                  <button className="btn btn-lime btn-sm" onClick={() => publish()} disabled={busy}>
                    <Icon name="send" size={16} /> {pub ? 'Publish changes' : 'Publish my card'}
                  </button>
                )}
              </div>
            )}
            {url ? (
              <>
                <div className="share-box">
                  <span className="share-url">{url.replace(/^https?:\/\//, '')}</span>
                  <button className="btn btn-lime btn-sm" onClick={copy}>
                    <Icon name="copy" size={16} /> Copy
                  </button>
                </div>
                <p className="field-hint">
                  {bytes} bytes on the chip — fits every common NFC card (NTAG213 holds 137 bytes, NTAG215 holds 496, NTAG216 holds 868).
                </p>
              </>
            ) : (
              <p className="muted">Publish your card to get a short link that can be written to an NFC card.</p>
            )}
          </div>
        </section>

        {/* Step 2 — write */}
        <section className="panel nfc-step">
          <div className="step-badge">2</div>
          <div className="nfc-step-body">
            <h2>Write it to your NFC card</h2>
            {!url ? (
              <p className="muted">Publish first (step 1).</p>
            ) : hasWebNfc ? (
              <NfcWriter url={url} onDone={() => showToast('NFC card written')} />
            ) : isIOS ? (
              <div className="nfc-guide">
                <p>Safari on iPhone can’t write NFC cards yet, but it takes a minute with the free <b>NFC Tools</b> app:</p>
                <ol>
                  <li><button className="link-btn inline" onClick={copy}>Copy your link</button></li>
                  <li>Open <b>NFC Tools</b> → <b>Write</b> → <b>Add a record</b> → <b>URL / URI</b></li>
                  <li>Paste your link and tap <b>OK</b></li>
                  <li>Tap <b>Write</b> and hold the card at the top of your iPhone</li>
                </ol>
                <p className="field-hint">Or open this page on an Android phone in Chrome to write with one tap.</p>
              </div>
            ) : (
              <div className="nfc-handoff">
                <div className="nfc-guide">
                  <p>
                    {isAndroid
                      ? 'Your browser can’t write NFC. Open this page in Chrome for Android, or scan the code with your phone.'
                      : 'Computers can’t write NFC cards. Scan this code with an Android phone to open the writer in Chrome — it takes one tap.'}
                  </p>
                  <p className="field-hint">On iPhone, use the free NFC Tools app: Write → Add a record → URL → paste your link → Write.</p>
                </div>
                {handoffQr && <img className="handoff-qr" src={handoffQr} alt="QR code to open the NFC writer on your phone" />}
              </div>
            )}
          </div>
        </section>

        {/* Step 3 — print */}
        <section className="panel nfc-step">
          <div className="step-badge">3</div>
          <div className="nfc-step-body">
            <h2>Print the card design</h2>
            <p className="muted">Print-ready artwork at 300 DPI in standard card size (85.6 × 54 mm). Send it to any NFC card printer, or print it on a sticker for a blank card.</p>
            {url && card ? (
              <>
                <div className="face-toggle" role="tablist">
                  {['front', 'back'].map((s) => (
                    <button key={s} role="tab" aria-selected={side === s} className={side === s ? 'on' : ''} onClick={() => setSide(s)}>
                      {s === 'front' ? 'Front' : 'Back'}
                    </button>
                  ))}
                </div>
                <div className={`face-stage show-${side}`}>
                  <div className="face-flip">
                    {faces.front ? <img className="face face-front" src={faces.front} alt="Card front" /> : <div className="face face-front face-skel" />}
                    {faces.back ? <img className="face face-back" src={faces.back} alt="Card back with QR code" /> : <div className="face face-back face-skel" />}
                  </div>
                </div>
                <div className="print-actions">
                  <button className="btn btn-dark" onClick={() => downloadFace('front', card, url, { bleed: true })}>
                    <Icon name="download" size={18} /> Front PNG
                  </button>
                  <button className="btn btn-dark" onClick={() => downloadFace('back', card, url, { bleed: true })}>
                    <Icon name="download" size={18} /> Back PNG
                  </button>
                  <button className="btn btn-outline" onClick={() => window.print()} disabled={!faces.front}>
                    <Icon name="printer" size={18} /> Print
                  </button>
                </div>
                <p className="field-hint">Downloads include 2 mm bleed for print shops. The back has a QR code too, so phones without NFC can still connect.</p>
              </>
            ) : (
              <p className="muted">Publish first (step 1).</p>
            )}
          </div>
        </section>

        <section className="panel install-panel">
          <span className="contact-ic">
            <Icon name="smartphone" size={22} />
          </span>
          <div className="nfc-step-body">
            <h2>{standalone ? 'You’re using the digibiz app' : 'Install digibiz as an app'}</h2>
            {standalone ? (
              <p className="muted">{isIOS ? 'Note: iPhone doesn’t let apps installed from the web use NFC. Use NFC Tools to write cards (step 2).' : 'NFC writing works right here in the app — no browser needed.'}</p>
            ) : isIOS ? (
              <p className="muted">In Safari, tap <b>Share</b> → <b>Add to Home Screen</b>. You can edit and share your card from the app. Writing NFC still needs the NFC Tools app on iPhone.</p>
            ) : (
              <>
                <p className="muted">Keep your card one tap away on your home screen. On Android, the app can write NFC cards just like Chrome.</p>
                {install ? (
                  <button className="btn btn-dark" onClick={install} style={{ alignSelf: 'flex-start' }}>
                    <Icon name="download" size={18} /> Install app
                  </button>
                ) : (
                  <p className="field-hint">In Chrome, open the menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>
                )}
              </>
            )}
          </div>
        </section>

        <section className="nfc-tips">
          <div className="tip">
            <Icon name="card" size={22} />
            <div>
              <b>Which NFC cards?</b>
              <p>Any blank NFC card, sticker or key tag marked NTAG213, NTAG215 or NTAG216. They cost very little online.</p>
            </div>
          </div>
          <div className="tip">
            <Icon name="smartphone" size={22} />
            <div>
              <b>Which phones can read it?</b>
              <p>iPhone XS and newer, and nearly all Android phones with NFC switched on. Tap the top of an iPhone or the middle-back of an Android.</p>
            </div>
          </div>
          <div className="tip">
            <Icon name="edit" size={22} />
            <div>
              <b>Changed jobs?</b>
              <p>Just edit and publish. Your NFC card, QR code and link keep working and show your latest details.</p>
            </div>
          </div>
        </section>
      </main>

      {faces.front && (
        <div className="print-sheet" aria-hidden="true">
          <img src={faces.front} alt="" />
          <img src={faces.back} alt="" />
        </div>
      )}
      {toast}
    </div>
  )
}
