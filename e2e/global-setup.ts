import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { ADMIN_EMAIL, DEACTIVATED_EMAIL, EDITOR_EMAIL, VIEWER_EMAIL } from './helpers'

/**
 * Before the end-to-end run: make sure the test logins exist and clear their recent code requests,
 * so re-running the suite within 15 minutes does not trip the server's "5 codes per 15 minutes"
 * limit. This touches the LOCAL stack only, using the local service-role key.
 */
export default async function globalSetup() {
  const raw = execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const status = JSON.parse(raw.slice(raw.indexOf('{'))) as { API_URL: string; SERVICE_ROLE_KEY: string }
  if (!/127\.0\.0\.1|localhost/.test(status.API_URL)) {
    throw new Error(`Refusing to run end-to-end tests against ${status.API_URL}; they are for the local stack only.`)
  }

  execFileSync('node', ['scripts/create-local-users.mjs'], { stdio: 'inherit' })

  const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: users, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  const testEmails = new Set([ADMIN_EMAIL, EDITOR_EMAIL, VIEWER_EMAIL, DEACTIVATED_EMAIL])
  const ids = users.users.filter((u) => u.email && testEmails.has(u.email)).map((u) => u.id)
  if (ids.length) {
    const { error: delErr } = await admin.from('mfa_challenges').delete().in('user_id', ids)
    if (delErr) throw delErr
    const { error: sessErr } = await admin.from('mfa_verified_sessions').delete().in('user_id', ids)
    if (sessErr) throw sessErr
  }
}
