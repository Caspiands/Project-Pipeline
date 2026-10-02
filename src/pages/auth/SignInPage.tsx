import { Link } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'

export function SignInPage() {
  return (
    <AuthLayout>
      <h2>Sign in</h2>
      <p>Signing in is built in phase 3. This screen shows the layout only; the fields do nothing yet.</p>
      <form noValidate onSubmit={(e) => e.preventDefault()}>
        <label className="field">
          <span>Work email</span>
          <input type="email" autoComplete="username" disabled />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" disabled />
        </label>
        <button className="primary" type="submit" disabled>
          Continue
        </button>
        <div className="row">
          <Link to="/reset" className="linkbtn">
            Forgot password?
          </Link>
          <span className="small muted">Next: a code sent to your email</span>
        </div>
      </form>
      <p className="small" style={{ marginTop: 14 }}>
        <Link to="/overview">Preview the board layout</Link>
      </p>
    </AuthLayout>
  )
}
