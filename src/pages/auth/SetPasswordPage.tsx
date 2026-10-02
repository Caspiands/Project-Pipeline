import { AuthLayout } from '@/components/AuthLayout'

export function SetPasswordPage() {
  return (
    <AuthLayout>
      <h2>Set your password</h2>
      <p>Use at least 10 characters. Avoid a password you use elsewhere.</p>
      <form noValidate onSubmit={(e) => e.preventDefault()}>
        <label className="field">
          <span>New password</span>
          <input type="password" autoComplete="new-password" minLength={10} disabled />
        </label>
        <label className="field">
          <span>Repeat new password</span>
          <input type="password" autoComplete="new-password" minLength={10} disabled />
        </label>
        <button className="primary" type="submit" disabled>
          Save password
        </button>
      </form>
      <div className="msg info" style={{ marginTop: 14 }}>
        Invite and recovery links land here from phase 3.
      </div>
    </AuthLayout>
  )
}
