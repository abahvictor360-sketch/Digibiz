import { useSyncExternalStore } from 'react'
import { supabase, dbError } from './supabase.js'

let state = { loading: true, session: null, user: null, profile: null }
const listeners = new Set()
const emit = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

async function load(session) {
  if (!session) return emit({ loading: false, session: null, user: null, profile: null })
  const { data } = await supabase.from('profiles').select('id, email, full_name, role, created_at').eq('id', session.user.id).maybeSingle()
  emit({ loading: false, session, user: session.user, profile: data || null })
}

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
