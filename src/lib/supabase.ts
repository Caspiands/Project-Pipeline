import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { env, missingEnv, type AppEnv } from './env'

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return true
  }
}

/** Dev-only fallback when `.env.local` is missing; production builds must set VITE_* (see validate-production-env.mjs). */
function resolveSupabaseEnv(): AppEnv {
  const gaps = missingEnv(env)
  if (import.meta.env.PROD) {
    if (gaps.length) {
      throw new Error(`Missing ${gaps.join(' and ')}. Set them on the host before building.`)
    }
    if (isLocalSupabaseUrl(env.supabaseUrl)) {
      throw new Error('Production cannot use a localhost Supabase URL.')
    }
    return env
  }
  if (!gaps.length) return env
  // Local Vite proxies /auth, /rest, /functions to Kong — see vite.config.ts and `npm run db:env`.
  return {
    supabaseUrl: 'http://127.0.0.1:5917',
    supabaseAnonKey: 'missing-anon-key',
  }
}

const configured = resolveSupabaseEnv()

/**
 * The one Supabase client for the browser. It uses the anon (public) key; every table is
 * protected by Row Level Security, so the key on its own reveals nothing.
 *
 * `flowType: 'implicit'` matches the prototype: invite and recovery emails land on
 * /set-password with the tokens in the URL hash, which `detectSessionInUrl` picks up.
 */
export const supabase = createClient<Database>(configured.supabaseUrl, configured.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
})
