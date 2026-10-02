import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'
import { FilterBar } from './FilterBar'
import { IdleTimeoutGuard } from './IdleTimeoutGuard'
import { OpportunityDrawer } from './OpportunityDrawer'
import { ThemeToggle } from './ThemeToggle'
import { Toast } from './Toast'
import { useAuth } from '@/lib/auth/auth'
import { useProfile } from '@/lib/auth/useProfile'
import { BoardProvider, useBoard } from '@/lib/board/BoardProvider'
import { fmtTime } from '@/lib/format'

export const TABS = [
  { to: '/overview', label: 'Overview', adminOnly: false },
  { to: '/pipeline', label: 'Pipeline', adminOnly: false },
  { to: '/review', label: 'Review', adminOnly: false },
  { to: '/prospects', label: 'Prospects', adminOnly: false },
  { to: '/targets', label: 'Targets', adminOnly: false },
  { to: '/team', label: 'Team & access', adminOnly: true },
  { to: '/audit', label: 'Audit log', adminOnly: true },
] as const

/**
 * The board's frame: sticky top bar with brand, who is signed in, and the tabs.
 * Rendered only inside RequireVerified, so there is always a verified session here.
 */
/** Verified board chrome: provider wraps every child that calls useBoard (including Toast). */
export function AppShell() {
  return (
    <BoardProvider>
      <IdleTimeoutGuard />
      <AppShellFrame />
      <OpportunityDrawer />
      <Toast />
    </BoardProvider>
  )
}

function AppShellFrame() {
  const auth = useAuth()
  const board = useBoard()
  const navigate = useNavigate()
  const profile = useProfile()
  const role = auth.status?.role ?? null
  const isAdmin = role === 'admin'
  const canWrite = role === 'admin' || role === 'editor'
  const name = profile.data?.full_name || auth.session?.user.email || ''

  const signOut = async () => {
    await auth.signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="top-row">
            <div className="brand-block">
              <BrandLogo variant="bar" />
              <h1 className="auth-product brand-product">Pipeline Board</h1>
              <div className="sub">Whole company · values in RM · one row per opportunity</div>
            </div>
            <span className="spacer" />
            <div className="who">
              <span>
                <b>{name}</b>
              </span>
              {role && <span className="role">{role}</span>}
              {auth.status?.expiresAt && <span className="small">verified until {fmtTime(auth.status.expiresAt)}</span>}
              <ThemeToggle />
              <button type="button" className="ghost" onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
            {canWrite && (
              <button className="primary" type="button" onClick={() => board.openCreate()}>
                Add opportunity
              </button>
            )}
          </div>
          <nav className="tabs" aria-label="Sections">
            {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
              <NavLink key={t.to} to={t.to}>
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <div className="wrap">
        {role === 'viewer' && (
          <div className="banner" role="status">
            You have view-only access. Ask an admin for editor access to add or change opportunities.
          </div>
        )}
        <FilterBar />
        <main className="stack">
          <Outlet />
        </main>
      </div>
    </>
  )
}
