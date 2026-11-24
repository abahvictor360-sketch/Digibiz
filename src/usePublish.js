import { useCallback, useState } from 'react'
import { cardFingerprint, cardLink, loadPub, publishCard } from './lib.js'

// Tracks whether the current card has been published and gives a publish()
// that only hits the server when something changed.
export function usePublish(card) {
  const [pub, setPub] = useState(loadPub)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dirty = !pub || pub.fingerprint !== cardFingerprint(card)

  const publish = useCallback(
    async ({ force = false } = {}) => {
      if (!card.name?.trim()) {
        setError('Add your name before publishing')
        return null
      }
      if (!force && pub && pub.fingerprint === cardFingerprint(card)) return pub
      setBusy(true)
      setError('')
      try {
        const next = await publishCard(card)
        setPub(next)
        return next
      } catch (e) {
        setError(e.message)
        return null
      } finally {
        setBusy(false)
      }
    },
    [card, pub]
  )

  return { pub, link: pub ? cardLink(pub.id) : '', dirty, busy, error, publish, clearError: () => setError('') }
}
