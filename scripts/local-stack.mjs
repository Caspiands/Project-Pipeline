// Helpers shared by the local-development scripts: read the running local Supabase stack's keys.
import { execFileSync } from 'node:child_process'

export function localStatus() {
  let raw
  try {
    raw = execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (e) {
    console.error('Could not read the local Supabase status. Is the stack running? Start it with: npx supabase start')
    throw e
  }
  const status = JSON.parse(raw.slice(raw.indexOf('{')))
  const apiUrl = status.API_URL
  const anonKey = status.ANON_KEY
  const serviceRoleKey = status.SERVICE_ROLE_KEY
  if (!apiUrl || !anonKey || !serviceRoleKey) throw new Error('Local Supabase status did not include API_URL, ANON_KEY and SERVICE_ROLE_KEY')
  return { apiUrl, anonKey, serviceRoleKey }
}
