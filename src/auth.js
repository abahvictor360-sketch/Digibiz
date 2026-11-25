// Signed-in user, shared across the app.
import { useEffect, useSyncExternalStore } from 'react'
import { api } from './lib.js'

let state = { user: null, loading: true }
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const set = (patch) => {
  state = { ...state, ...patch }
  emit()
}

let inflight = null
export function refreshUser() {
  inflight ||= api('/api/auth')
    .then((d) => set({ user: d.user, loading: false }))
    .catch(() => set({ loading: false }))
    .finally(() => {
      inflight = null
    })
  return inflight
}

export const setUser = (user) => set({ user, loading: false })

export async function signUp(email, password, name) {
  const { user } = await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'signup', email, password, name }) })
  setUser(user)
  return user
}
export async function signIn(email, password) {
  const { user } = await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email, password }) })
  setUser(user)
  return user
}
export async function signOut() {
  await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) }).catch(() => {})
  setUser(null)
}

let started = false
export function useAuth() {
  const snap = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state
  )
  useEffect(() => {
    if (!started) {
      started = true
      refreshUser()
    }
  }, [])
  return snap
}

// Sends the visitor to sign in, then back to where they were.
export function loginUrl(next = window.location.pathname + window.location.search) {
  return `/login?next=${encodeURIComponent(next)}`
}

// ---- Billing ----
export async function startCheckout() {
  const { url } = await api('/api/billing', { method: 'POST', body: JSON.stringify({ action: 'checkout' }) })
  window.location.href = url
}
export async function openBillingPortal() {
  const { url } = await api('/api/billing', { method: 'POST', body: JSON.stringify({ action: 'portal' }) })
  window.location.href = url
}
export async function confirmCheckout(sessionId) {
  const { user } = await api('/api/billing', { method: 'POST', body: JSON.stringify({ action: 'confirm', sessionId }) })
  setUser(user)
  return user
}

let billingCfg = null
export async function getBillingConfig() {
  billingCfg ||= api('/api/billing').catch(() => ({ ready: false, priceCents: 600, currency: 'usd' }))
  return billingCfg
}
export const formatPrice = (cents, cur = 'usd') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: cur.toUpperCase(), minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100)
