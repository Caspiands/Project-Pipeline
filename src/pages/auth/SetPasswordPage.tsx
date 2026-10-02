import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'
import { AuthMessage } from '@/components/AuthMessage'
import { CheckingScreen } from '@/components/CheckingScreen'
import { useAuth, type Notice } from '@/lib/auth/auth'
import { AUTH_COPY } from '@/lib/auth/messages'
import { passwordSchema, type PasswordValues } from '@/lib/auth/schemas'
import { supabase } from '@/lib/supabase'

/**
 * Reached from invite and password-reset emails (`type=invite` / `type=recovery` in the link, or
 * the PASSWORD_RECOVERY event). After saving, the person continues to the code step.
 */
export function SetPasswordPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState<Notice | null>(null)
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  })
  const { errors, isSubmitting } = form.formState

  if (auth.loading) return <CheckingScreen />
  if (!auth.session) {
    return (
      <AuthLayout>
        <h2>Set your password</h2>
        <AuthMessage notice={{ text: AUTH_COPY.needLink, kind: 'info' }} />
        <p className="small" style={{ marginTop: 14 }}>
          <Link to="/sign-in">Back to sign in</Link> · <Link to="/reset">Request a new reset link</Link>
        </p>
      </AuthLayout>
    )
  }
  // Only people arriving from an invite or reset link set a password here.
  if (!auth.needsPassword) return <Navigate to={auth.status?.verified ? '/overview' : '/verify'} replace />

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage({ text: error.message, kind: 'err' })
      return
    }
    form.reset()
    window.history.replaceState(null, '', window.location.pathname)
    auth.passwordSaved()
    auth.setNotice({ text: AUTH_COPY.passwordSaved, kind: 'ok' })
    navigate('/verify', { replace: true })
  })

  const fieldError = errors.password?.message ?? errors.confirm?.message
  const shown = message ?? (fieldError ? { text: fieldError, kind: 'err' as const } : null)

  return (
    <AuthLayout>
      <h2>Set your password</h2>
      <p>Use at least 10 characters. Avoid a password you use elsewhere.</p>
      <form noValidate onSubmit={onSubmit}>
        <label className="field">
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={10}
            autoFocus
            aria-invalid={!!errors.password}
            {...form.register('password')}
          />
        </label>
        <label className="field">
          <span>Repeat new password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={10}
            aria-invalid={!!errors.confirm}
            {...form.register('confirm')}
          />
        </label>
        <button className="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save password'}
        </button>
      </form>
      <AuthMessage notice={shown} style={{ marginTop: 14 }} />
    </AuthLayout>
  )
}
