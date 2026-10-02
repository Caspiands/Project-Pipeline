import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth/auth'
import { useDeactivatedSignOut, useSessionExpiry } from '@/lib/auth/guards'
import { AUTH_COPY } from '@/lib/auth/messages'
import { AuthLayout } from './AuthLayout'
import { AuthMessage } from './AuthMessage'
import { CheckingScreen } from './CheckingScreen'

/**
 * The route guard around the board. The board opens only when the database says this login
 * session has passed the emailed code (`my_mfa_status().verified`), and nothing about that is
 * remembered in the browser.
 */
export function RequireVerified() {
  const auth = useAuth()
  useSessionExpiry(auth.status)
  const deactivated = useDeactivatedSignOut(auth.status)

  if (auth.loading) return <CheckingScreen />
  if (!auth.session) return <Navigate to="/sign-in" replace />
  if (auth.needsPassword) return <Navigate to="/set-password" replace />
  if (deactivated) return <CheckingScreen text="Signing you out…" />
  if (!auth.status) {
    if (auth.statusError) {
      return (
        <AuthLayout>
          <h2>Sign in</h2>
          <AuthMessage notice={{ text: AUTH_COPY.statusCheckFailed(auth.statusError), kind: 'err' }} />
          <div className="row" style={{ marginTop: 14 }}>
            <button type="button" className="primary" onClick={() => void auth.refreshStatus()}>
              Try again
            </button>
            <button type="button" className="linkbtn" onClick={() => void auth.signOut(null)}>
              Sign out
            </button>
          </div>
        </AuthLayout>
      )
    }
    return <CheckingScreen />
  }
  if (!auth.status.verified) return <Navigate to="/verify" replace />
  return <Outlet />
}
