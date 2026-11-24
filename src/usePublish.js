import { useCallback, useState } from 'react'
import { cardFingerprint, cardLink, createCard, loadPub, publishCard, updateOwnedCard } from './lib.js'

// Tracks whether the current card has been published and gives a publish()
// that only hits the server when something changed.
//
// target: { mode: 'local' }            card kept in this browser (default)
//         { mode: 'new' }              a new card for the signed-in account
//         { mode: 'owned', id, fingerprint } an account card being edited
export function usePublish(card, target = { mode: 'local' }, onCreated) {
  const [pub, setPub] = useState(() => (target.mode === 'local' ? loadPub() : target.mode === 'owned' ? { id: target.id, fingerprint: target.fingerprint } : null))
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
        let next
        if (target.mode === 'local') next = await publishCard(card)
        else if (pub?.id) {
          await updateOwnedCard(pub.id, card)
          next = { id: pub.id, fingerprint: cardFingerprint(card) }
        } else {
          const { id } = await createCard(card)
          next = { id, fingerprint: cardFingerprint(card) }
          onCreated?.(id)
        }
        setPub(next)
        return next
      } catch (e) {
        setError(e.message)
        return null
      } finally {
        setBusy(false)
      }
    },
    [card, pub, target.mode, onCreated]
  )

  // Lets the editor mark a freshly loaded account card as already published.
  const reset = useCallback((next) => setPub(next), [])

  return { pub, link: pub ? cardLink(pub.id) : '', dirty, busy, error, publish, reset, clearError: () => setError('') }
}
