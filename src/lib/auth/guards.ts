import { useEffect, useRef } from 'react'
import { useAuth } from './auth'
import { AUTH_COPY } from './messages'
import { clearOtpSentFlags, type MfaStatus } from './mfaStatus'

const MAX_TIMEOUT_MS = 2_147_483_000

/**
 * Sends the user back to the code step when their verified session runs out (MFA_SESSION_HOURS).
 * The database is asked again before anything changes; the timer only prompts the question.
 */
export function useSessionExpiry(status: MfaStatus | null) {
  const { refreshStatus, setNotice } = useAuth()
  const expiresAt = status?.verified ? status.expiresAt : null

  useEffect(() => {
    if (!expiresAt) return
    const ms = new Date(expiresAt).getTime() - Date.now()
    // If the clock says it has already passed but the database still says verified, ask again shortly.
    const delay = ms <= 0 ? 5_000 : Math.min(ms, MAX_TIMEOUT_MS)
    const timer = setTimeout(async () => {
      const next = await refreshStatus().catch(() => null)
      if (next && !next.verified) {
        clearOtpSentFlags()
        setNotice({ text: AUTH_COPY.sessionEnded, kind: 'info' })
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [expiresAt, refreshStatus, setNotice])
}

/** Signs out a login whose profile has no role (access switched off or never set up). */
export function useDeactivatedSignOut(status: MfaStatus | null): boolean {
  const { signOut } = useAuth()
  const done = useRef(false)
  const deactivated = !!status && status.role === null
  useEffect(() => {
    if (!deactivated || done.current) return
    done.current = true
    void signOut({ text: AUTH_COPY.deactivated, kind: 'err' })
  }, [deactivated, signOut])
  return deactivated
}
