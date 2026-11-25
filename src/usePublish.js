import { useCallback, useState } from 'react'
import { cardFingerprint, cardLink, loadPub, publishCard } from './lib.js'
import { setUser, useAuth } from './auth.js'

// Publishing needs a signed-in Pro account. When it's missing, `need` tells the
// page which prompt to show: 'login' or 'pro'.
export function usePublish(card) {
  const { user, loading } = useAuth()
  const [local, setLocal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [need, setNeed] = useState('')

  const pub = local && local.id === user?.cardId ? local : loadPub(user?.cardId)
  const dirty = !pub || pub.fingerprint !== cardFingerprint(card)

  const publish = useCallback(
    async ({ force = false } = {}) => {
      if (!user) {
        setNeed('login')
        return null
      }
      if (!user.pro) {
        setNeed('pro')
        return null
      }
      if (!card.name?.trim()) {
        setError('Add your name before publishing')
        return null
      }
      if (!force && pub && pub.fingerprint === cardFingerprint(card)) return pub
      setBusy(true)
      setError('')
      try {
        const { pub: next, user: u } = await publishCard(card)
        if (u) setUser(u)
        setLocal(next)
        return next
      } catch (e) {
        if (e.status === 401) setNeed('login')
        else if (e.status === 402) setNeed('pro')
        else setError(e.message)
        return null
      } finally {
        setBusy(false)
      }
    },
    [card, pub, user]
  )

  return {
    pub,
    link: pub ? cardLink(pub.id) : '',
    dirty,
    busy,
    error,
    need,
    user,
    authLoading: loading,
    publish,
    clearError: () => setError(''),
    clearNeed: () => setNeed(''),
  }
}
