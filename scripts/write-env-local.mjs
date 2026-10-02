// Writes .env.local for the Vite app from the running local Supabase stack.
//   npm run db:env
import { writeFileSync } from 'node:fs'
import { localStatus } from './local-stack.mjs'

const { anonKey } = localStatus()
// Browser uses the Vite port; vite.config.ts proxies /auth, /rest, /realtime, /functions to Kong.
const browserApiUrl = 'http://127.0.0.1:5917'
writeFileSync('.env.local', `VITE_SUPABASE_URL=${browserApiUrl}\nVITE_SUPABASE_ANON_KEY=${anonKey}\n`)
console.log(`Wrote .env.local pointing at ${browserApiUrl} (proxied to local Supabase)`)
