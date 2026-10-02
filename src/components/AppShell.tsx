import { NavLink, Outlet } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { isConfigured, missingEnv, env } from '@/lib/env'

export const TABS = [
  { to: '/overview', label: 'Overview' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/review', label: 'Review' },
  { to: '/prospects', label: 'Prospects' },
  { to: '/targets', label: 'Targets' },
  { to: '/team', label: 'Team & access' },
] as const

/**
 * The board's frame: sticky top bar with brand, who-is-signed-in block and tabs.
 * Sign-in details and the "Add opportunity" action come alive in later phases.
 */
export function AppShell() {
  const missing = missingEnv(env)
  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="top-row">
            <div>
              <h1 className="brand">CDS Pipeline Board</h1>
              <div className="sub">Whole company · values in RM · one row per opportunity</div>
            </div>
            <span className="spacer" />
            <div className="who">
              <span>
                <b>Not signed in</b>
              </span>
              <span className="role">preview</span>
              <ThemeToggle />
              <NavLink to="/sign-in" className="small">
                Sign in
              </NavLink>
            </div>
            <button className="primary" type="button" disabled title="Available once the pipeline tab is built">
              Add opportunity
            </button>
          </div>
          <nav className="tabs" aria-label="Sections">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to}>
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <div className="wrap">
        {!isConfigured && (
          <div className="banner" role="status">
            Not connected to Supabase yet: {missing.join(' and ')} {missing.length === 1 ? 'is' : 'are'} missing. Copy{' '}
            <code>.env.example</code> to <code>.env.local</code> and fill in the values from{' '}
            <code>npx supabase status</code>.
          </div>
        )}
        <main className="stack">
          <Outlet />
        </main>
      </div>
    </>
  )
}
