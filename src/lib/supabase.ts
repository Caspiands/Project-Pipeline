import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { env, isConfigured } from './env'

/**
 * The one Supabase client for the browser. It uses the anon (public) key; every table is
 * protected by Row Level Security, so the key on its own reveals nothing.
 *
 * `flowType: 'implicit'` matches the prototype: invite and recovery emails land on
 * /set-password with the tokens in the URL hash, which `detectSessionInUrl` picks up.
 */
export const supabase = createClient<Database>(
  isConfigured ? env.supabaseUrl : 'http://127.0.0.1:54321',
  isConfigured ? env.supabaseAnonKey : 'missing-anon-key',
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
  },
)
