#!/usr/bin/env node
/**
 * Runs before `vite build` so production bundles never ship with localhost fallbacks.
 * Vercel must set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in project settings.
 */
const url = (process.env.VITE_SUPABASE_URL ?? '').trim()
const key = (process.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

const errors = []
if (!url) errors.push('VITE_SUPABASE_URL is not set')
if (!key) errors.push('VITE_SUPABASE_ANON_KEY is not set')

function isLocalHost(u) {
  try {
    const { hostname } = new URL(u)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return true
  }
}

if (url && isLocalHost(url)) {
  errors.push(`VITE_SUPABASE_URL must not point at localhost (got ${url})`)
}

if (errors.length) {
  console.error('Production build blocked:\n' + errors.map((e) => `  - ${e}`).join('\n'))
  console.error(
    '\nSet VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the host (e.g. Vercel → Environment Variables) before building.',
  )
  process.exit(1)
}

console.log(`Production env OK: Supabase URL is ${url}`)
