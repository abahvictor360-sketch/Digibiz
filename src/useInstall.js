import { useEffect, useState } from 'react'

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

// Returns install() when the browser offers installation (Chrome/Edge/Android), else null.
export function useInstall() {
  const [prompt, setPrompt] = useState(() => window.__installPrompt || null)
  useEffect(() => {
    const update = () => setPrompt(window.__installPrompt || null)
    window.addEventListener('digibiz:installable', update)
    return () => window.removeEventListener('digibiz:installable', update)
  }, [])
  if (!prompt) return null
  return async () => {
    prompt.prompt()
    await prompt.userChoice.catch(() => {})
    window.__installPrompt = null
    setPrompt(null)
  }
}
