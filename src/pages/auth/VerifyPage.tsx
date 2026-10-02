import { Link } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'

export function VerifyPage() {
  return (
    <AuthLayout>
      <h2>Check your email</h2>
      <p>We sent a 6-digit code to your email. It expires in 10 minutes.</p>
      <form noValidate onSubmit={(e) => e.preventDefault()}>
        <label className="field">
          <span>6-digit code</span>
          <input className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} pattern="[0-9 ]*" disabled />
        </label>
        <button className="primary" type="submit" disabled>
          Verify and open the board
        </button>
        <div className="row">
          <span className="linkbtn" aria-disabled="true">
            Send a new code
          </span>
          <Link to="/sign-in" className="linkbtn">
            Use a different account
          </Link>
        </div>
      </form>
      <div className="msg info" style={{ marginTop: 14 }}>
        The emailed code is wired up in phase 3.
      </div>
    </AuthLayout>
  )
}
