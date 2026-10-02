import { Link } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'

export function ResetPage() {
  return (
    <AuthLayout>
      <h2>Reset your password</h2>
      <p>We'll email you a link to set a new password. You will still need a sign-in code afterwards.</p>
      <form noValidate onSubmit={(e) => e.preventDefault()}>
        <label className="field">
          <span>Work email</span>
          <input type="email" autoComplete="username" disabled />
        </label>
        <button className="primary" type="submit" disabled>
          Email me a reset link
        </button>
        <div className="row">
          <Link to="/sign-in" className="linkbtn">
            Back to sign in
          </Link>
        </div>
      </form>
      <div className="msg info" style={{ marginTop: 14 }}>
        Password resets are wired up in phase 3.
      </div>
    </AuthLayout>
  )
}
