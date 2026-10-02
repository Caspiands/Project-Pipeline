import type { ReactNode } from 'react'
import { ThemeToggle } from './ThemeToggle'

/** Centred card used by the sign-in, code, reset and set-password screens. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-theme">
        <ThemeToggle />
      </div>
      <div className="auth-card">
        <h1>CDS Pipeline Board</h1>
        <p className="small">Caspian Digital Solutions · staff only</p>
        {children}
      </div>
    </div>
  )
}
