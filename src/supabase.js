import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from './config.js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

// Turn a Supabase/PostgREST error into a plain Error with a friendly message.
export function dbError(error) {
  const offline = !error.code && /fetch|network/i.test(error.message || '')
  const err = new Error(offline ? 'You appear to be offline. Check your connection and try again.' : error.message || 'Something went wrong')
  err.code = error.code
  if (error.code === 'P0002') err.status = 404
  if (error.code === '42501') err.status = 403
  return err
}

export async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw dbError(error)
  return data
}
