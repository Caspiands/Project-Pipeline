// Creates test logins in the LOCAL Supabase stack so the sign-in flow can be tried end to end.
//   npm run db:users
//
// Logins (password for all: see LOCAL_PASSWORD below):
//   admin@caspiands.com   admin, active   (the seed's "Bharg" owner is linked to this email)
//   editor@caspiands.com  editor, active
//   viewer@caspiands.com  viewer, active
//   off@caspiands.com     editor, access switched off (is_active = false)
//
// Safe to run again: existing users are left alone and their role/active flag is re-applied.
// It talks to the local stack with the service-role key, which never leaves this machine.
import { createClient } from '@supabase/supabase-js'
import { localStatus } from './local-stack.mjs'

export const LOCAL_PASSWORD = 'pipeline-local-2026'

export const LOCAL_USERS = [
  { email: 'admin@caspiands.com', full_name: 'Bharg', role: 'admin', is_active: true },
  { email: 'editor@caspiands.com', full_name: 'Test editor', role: 'editor', is_active: true },
  { email: 'viewer@caspiands.com', full_name: 'Test viewer', role: 'viewer', is_active: true },
  { email: 'off@caspiands.com', full_name: 'Switched off', role: 'editor', is_active: false },
]

const { apiUrl, serviceRoleKey } = localStatus()
if (!/127\.0\.0\.1|localhost/.test(apiUrl)) {
  console.error(`Refusing to create test users against ${apiUrl}: this script is for the local stack only.`)
  process.exit(1)
}

const admin = createClient(apiUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

const { data: existing, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
if (listErr) throw listErr

for (const u of LOCAL_USERS) {
  let user = existing.users.find((x) => x.email?.toLowerCase() === u.email)
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: LOCAL_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    })
    if (error) throw error
    user = data.user
    console.log(`Created ${u.email}`)
  } else {
    console.log(`Already exists ${u.email}`)
  }
  // The new-user trigger made the profile as a viewer; set the intended role and access flag.
  const { error: pErr } = await admin
    .from('profiles')
    .update({ role: u.role, is_active: u.is_active, full_name: u.full_name })
    .eq('id', user.id)
  if (pErr) throw pErr
  console.log(`  role=${u.role} active=${u.is_active}`)
}

console.log(`\nPassword for all test logins: ${LOCAL_PASSWORD}`)
console.log('Sign-in codes are printed by mfa-send; see: npm run functions:logs')
