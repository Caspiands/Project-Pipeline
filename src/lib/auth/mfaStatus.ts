import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type AppRole = Database['public']['Enums']['app_role']

/** What `my_mfa_status()` tells us about the current login session. */
export interface MfaStatus {
  verified: boolean
  role: AppRole | null
  expiresAt: string | null
}

export function parseMfaStatus(raw: unknown): MfaStatus {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const role = r.role
  return {
    verified: r.verified === true,
    role: role === 'admin' || role === 'editor' || role === 'viewer' ? role : null,
    expiresAt: typeof r.expires_at === 'string' ? r.expires_at : null,
  }
}

/**
 * Asks the database whether this session has passed the emailed code. Nothing about
 * verification is stored in the browser; this is always the source of truth.
 */
export async function fetchMfaStatus(): Promise<MfaStatus> {
  const { data, error } = await supabase.rpc('my_mfa_status')
  if (error) throw new Error(error.message)
  return parseMfaStatus(data)
}

export const mfaStatusKey = (sessionId: string) => ['mfa-status', sessionId] as const

/** Key under which /verify remembers that a code was already sent for this session. */
export const otpSentKey = (sessionId: string) => `cdspb.otp.${sessionId}`

export function clearOtpSentFlags() {
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith('cdspb.otp.')) keys.push(k)
    }
    keys.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* sessionStorage unavailable */
  }
}
