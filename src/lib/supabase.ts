import { createClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

function normalizeSupabaseUrl(value: string): string {
  if (!value) return ''
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

const url = normalizeSupabaseUrl(rawUrl)
const key = rawKey

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'placeholder-anon-key'

// Prevent app crash when env vars are missing in local/dev.
export const supabase = createClient(url || FALLBACK_SUPABASE_URL, key || FALLBACK_SUPABASE_ANON_KEY)

export function isSupabaseConfigured(): boolean {
  return Boolean(url && key && !key.startsWith('REPLACE_WITH_'))
}
