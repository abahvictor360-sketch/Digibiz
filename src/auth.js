import { useSyncExternalStore } from 'react'
import { supabase, dbError } from './supabase.js'

let state = { loading: true, session: null, user: null, profile: null, subscription: null, isPro: false }
const listeners = new Set()
const emit = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

const ACTIVE = ['active', 'trialing', 'past_due']

// Mirrors public.is_pro() so the UI can decide before asking the server.
export function computePro(profile, sub) {
  if (profile?.role === 'admin' || profile?.comped) return true
  if (!sub || !ACTIVE.includes(sub.status)) return false
  return !sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now() - 3 * 864e5
}

async function load(session) {
  if (!session) return emit({ loading: false, session: null, user: null, profile: null, subscription: null, isPro: false })
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, role, comped, created_at').eq('id', session.user.id).maybeSingle(),
    supabase.from('subscriptions').select('status, interval, current_period_end, cancel_at_period_end').eq('user_id', session.user.id).maybeSingle(),
  ])
  emit({ loading: false, session, user: session.user, profile: profile || null, subscription: subscription || null, isPro: computePro(profile, subscription) })
}

export const getAuth = () => state

let started = false
function start() {
  if (started) return
  started = true
  // Don't await Supabase calls inside the callback itself (it holds an auth lock).
  supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(() => load(session), 0)
    if (event === 'PASSWORD_RECOVERY') window.__digibizRecovery = true
  })
}

export function useAuth() {
  start()
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state
  )
}

export const refreshProfile = () => supabase.auth.getSession().then(({ data }) => load(data.session))

export async function signOut() {
  await supabase.auth.signOut()
}

export async function must(promise) {
  const { data, error } = await promise
  if (error) throw dbError(error)
  return data
}
