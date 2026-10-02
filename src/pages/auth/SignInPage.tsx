import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'
import { AuthMessage } from '@/components/AuthMessage'
import { CheckingScreen } from '@/components/CheckingScreen'
import { useAuth, type Notice } from '@/lib/auth/auth'
import { signInErrorMessage } from '@/lib/auth/messages'
import { signInSchema, type SignInValues } from '@/lib/auth/schemas'
import { supabase } from '@/lib/supabase'

export function SignInPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState<Notice | null>(null)
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState

  if (auth.loading) return <CheckingScreen />
  if (auth.session) {
    if (auth.needsPassword) return <Navigate to="/set-password" replace />
    return <Navigate to={auth.status?.verified ? '/overview' : '/verify'} replace />
  }

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setMessage(null)
    auth.setNotice(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage({ text: signInErrorMessage(error.message), kind: 'err' })
      form.resetField('password')
      return
    }
    form.reset()
    navigate('/verify', { replace: true })
  })

  const fieldError = errors.email?.message ?? errors.password?.message
  const shown = message ?? (fieldError ? { text: fieldError, kind: 'err' as const } : auth.notice)

  return (
    <AuthLayout>
      <h2>Sign in</h2>
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
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...form.register('password')}
          />
        </label>
        <button className="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Checking…' : 'Continue'}
        </button>
        <div className="row">
          <Link to="/reset" className="linkbtn">
            Forgot password?
          </Link>
          <span className="small muted">Next: a code sent to your email</span>
        </div>
      </form>
      <AuthMessage notice={shown} style={{ marginTop: 14 }} />
    </AuthLayout>
  )
}
