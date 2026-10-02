// Writes .env.local for the Vite app from the running local Supabase stack.
//   npm run db:env
import { writeFileSync } from 'node:fs'
import { localStatus } from './local-stack.mjs'

const { apiUrl, anonKey } = localStatus()
writeFileSync('.env.local', `VITE_SUPABASE_URL=${apiUrl}\nVITE_SUPABASE_ANON_KEY=${anonKey}\n`)
console.log(`Wrote .env.local pointing at ${apiUrl}`)
