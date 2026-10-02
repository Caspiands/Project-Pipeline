import type { ReactNode } from 'react'
import { BrandLogo } from './BrandLogo'
import { ThemeToggle } from './ThemeToggle'

/** Centred card used by the sign-in, code, reset and set-password screens. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-theme">
        <ThemeToggle />
      </div>
      <div className="auth-card">
        <BrandLogo variant="auth" />
        <h1 className="auth-product">Pipeline Board</h1>
        <p className="small">Staff only · internal sales tracking</p>
        {children}
      </div>
    </div>
  )
}
