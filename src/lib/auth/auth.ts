import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { MfaStatus } from './mfaStatus'

export type NoticeKind = 'err' | 'ok' | 'info'
export interface Notice {
  text: string
  kind: NoticeKind
}

export interface AuthState {
  /** True until the first session check has finished. */
  loading: boolean
  session: Session | null
  sessionId: string
  /** From the database. Null while it has not been fetched for this session yet. */
  status: MfaStatus | null
  statusError: string | null
  /** Set by invite / recovery links and the PASSWORD_RECOVERY event: show /set-password first. */
  needsPassword: boolean
  /** A one-off message to show on the next sign-in screen (signed out, session ended, access off). */
  notice: Notice | null
}

export interface AuthActions {
  refreshStatus: () => Promise<MfaStatus | null>
  signOut: (notice?: Notice | null) => Promise<void>
  setNotice: (notice: Notice | null) => void
  passwordSaved: () => void
}

export type AuthContextValue = AuthState & AuthActions

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
