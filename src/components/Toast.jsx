import { useCallback, useRef, useState } from 'react'
import Icon from './Icon.jsx'

export function useToast() {
  const [msg, setMsg] = useState('')
  const t = useRef(0)
  const show = useCallback((m) => {
    setMsg(m)
    clearTimeout(t.current)
    t.current = setTimeout(() => setMsg(''), 2200)
  }, [])
  const node = (
    <div className={`toast ${msg ? 'show' : ''}`} role="status" aria-live="polite">
      <Icon name="check" size={16} /> {msg}
    </div>
  )
  return [node, show]
}

export async function shareOrCopy(url, title, toast) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    toast('Link copied to clipboard')
  } catch {
    window.prompt('Copy this link', url)
  }
}
