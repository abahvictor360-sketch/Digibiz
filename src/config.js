// Where the contact form sends messages. Change this to your real inbox.
export const CONTACT_EMAIL = 'hello@digibiz.app'
// Optional WhatsApp number for the contact page (international format, digits only). Leave '' to hide.
export const CONTACT_WHATSAPP = ''

// Supabase project (database + accounts). The publishable key is safe to ship
// in the browser: Row Level Security in supabase/migrations decides what it can do.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mctrsqbupbptlrqjamid.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_6cCqE9TRKYiBFSfjDfscKw_3zpkd-xy'
