import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'
import { AuthMessage } from '@/components/AuthMessage'
import type { Notice } from '@/lib/auth/auth'
import { AUTH_COPY } from '@/lib/auth/messages'
import { resetSchema, type ResetValues } from '@/lib/auth/schemas'
import { supabase } from '@/lib/supabase'

export function ResetPage() {
  const [message, setMessage] = useState<Notice | null>(null)
  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { email: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setMessage(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    })
    // The same neutral message whatever happened, so nobody can learn which emails have accounts.
    if (error) console.warn('resetPasswordForEmail:', error.message)
    setMessage({ text: AUTH_COPY.resetSent, kind: 'ok' })
    form.reset()
  })

  const shown = message ?? (errors.email?.message ? { text: errors.email.message, kind: 'err' as const } : null)

  return (
    <AuthLayout>
      <h2>Reset your password</h2>
      <p>We'll email you a link to set a new password. You will still need a sign-in code afterwards.</p>
      <form noValidate onSubmit={onSubmit}>
        <label className="field">
          <span>Work email</span>
          <input
            type="email"
            autoComplete="username"
            autoFocus
            aria-invalid={!!errors.email}
            {...form.register('email')}
          />
        </label>
        <button className="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Email me a reset link'}
        </button>
        <div className="row">
          <Link to="/sign-in" className="linkbtn">
            Back to sign in
          </Link>
        </div>
      </form>
      <AuthMessage notice={shown} style={{ marginTop: 14 }} />
    </AuthLayout>
  )
}
