import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from './lib/auth/auth'
import { ThemeProvider } from './lib/ThemeProvider'
import { routerFuture, routes } from './router'

vi.mock('@/lib/auth/useProfile', () => ({
  useProfile: () => ({
    data: { id: 'u1', email: 'admin@caspiands.com', full_name: 'Bharg', role: 'admin', is_active: true },
  }),
}))
vi.mock('@/lib/auth/functions', () => ({
  sendCode: vi.fn(async () => ({ sent: true, email_hint: 'ad•••@caspiands.com', expires_in_seconds: 600 })),
  verifyCode: vi.fn(),
  FunctionError: class extends Error {},
}))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const session = {
  access_token: 't',
  user: { id: 'u1', email: 'admin@caspiands.com' },
} as unknown as AuthContextValue['session']

function authValue(over: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    loading: false,
    session: null,
    sessionId: '',
    status: null,
    statusError: null,
    needsPassword: false,
    notice: null,
    refreshStatus: vi.fn(async () => null),
    signOut: vi.fn(async () => {}),
    setNotice: vi.fn(),
    passwordSaved: vi.fn(),
    ...over,
  }
}

const verifiedAdmin = authValue({
  session,
  sessionId: 's1',
  status: { verified: true, role: 'admin', expiresAt: '2026-10-02T18:00:00Z' },
})

function renderAt(path: string, auth: AuthContextValue) {
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [path], future: routerFuture })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={auth}>
          <RouterProvider router={memoryRouter} future={{ v7_startTransition: true }} />
        </AuthContext.Provider>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

beforeEach(() => sessionStorage.clear())

describe('route guard', () => {
  it('sends a signed-out visitor to /sign-in', () => {
    renderAt('/overview', authValue())
    expect(screen.getByRole('heading', { level: 2, name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument()
  })

  it('sends a signed-in but unverified session to the code step and asks for a code once', async () => {
    const { sendCode } = await import('@/lib/auth/functions')
    renderAt(
      '/overview',
      authValue({ session, sessionId: 's1', status: { verified: false, role: 'viewer', expiresAt: null } }),
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Check your email' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/We sent a 6-digit code to ad•••@caspiands.com/)).toBeInTheDocument())
    expect(sendCode).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('cdspb.otp.s1')).toBe('1')
    expect(screen.getByRole('button', { name: /Send a new code \(\d+s\)/ })).toBeDisabled()
  })

  it('does not resend after a reload when the code was already sent for this session', async () => {
    sessionStorage.setItem('cdspb.otp.s1', '1')
    const { sendCode } = await import('@/lib/auth/functions')
    vi.mocked(sendCode).mockClear()
    renderAt(
      '/verify',
      authValue({ session, sessionId: 's1', status: { verified: false, role: 'viewer', expiresAt: null } }),
    )
    expect(screen.getByText(/Enter the 6-digit code we emailed you/)).toBeInTheDocument()
    expect(sendCode).not.toHaveBeenCalled()
  })

  it('signs out a login with no role and explains why', async () => {
    const auth = authValue({ session, sessionId: 's1', status: { verified: true, role: null, expiresAt: null } })
    renderAt('/overview', auth)
    await waitFor(() => expect(auth.signOut).toHaveBeenCalled())
    expect(vi.mocked(auth.signOut).mock.calls[0][0]).toEqual({
      text: 'Your access is switched off or not set up yet. Contact the board admin.',
      kind: 'err',
    })
  })

  it('sends an invite or recovery link holder to set a password first', () => {
    renderAt('/overview', authValue({ session, sessionId: 's1', needsPassword: true }))
    expect(screen.getByRole('heading', { level: 2, name: 'Set your password' })).toBeInTheDocument()
  })

  it('keeps a verified user out of the auth screens', () => {
    renderAt('/sign-in', verifiedAdmin)
    expect(screen.getByRole('heading', { level: 2, name: 'Overview' })).toBeInTheDocument()
  })
})

describe('board shell for a verified session', () => {
  it('redirects the root to the overview and shows all six tabs for an admin', () => {
    renderAt('/', verifiedAdmin)
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual([
      'Overview',
      'Pipeline',
      'Review',
      'Prospects',
      'Targets',
      'Team & access',
    ])
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Bharg')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText(/verified until/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('hides Team & access and shows the view-only banner for a viewer', () => {
    renderAt(
      '/overview',
      authValue({ session, sessionId: 's1', status: { verified: true, role: 'viewer', expiresAt: null } }),
    )
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    expect(within(nav).queryByRole('link', { name: 'Team & access' })).not.toBeInTheDocument()
    expect(screen.getByText(/view-only access/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add opportunity' })).not.toBeInTheDocument()
  })

  it.each([
    ['/pipeline', 'Pipeline'],
    ['/review', 'Pipeline review'],
    ['/prospects', 'Prospects not yet in the pipeline'],
    ['/targets', 'Company target'],
    ['/team', 'Team & access'],
  ])('renders a placeholder at %s', (path, heading) => {
    renderAt(path, verifiedAdmin)
    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument()
    expect(screen.getByText(/Coming in phase/)).toBeInTheDocument()
  })

  it('shows a not-found message for unknown addresses', () => {
    renderAt('/nowhere', verifiedAdmin)
    expect(screen.getByRole('heading', { level: 2, name: 'There is nothing at this address' })).toBeInTheDocument()
  })
})

describe('auth screens', () => {
  it.each([
    ['/sign-in', 'Sign in'],
    ['/reset', 'Reset your password'],
  ])('renders %s for a signed-out visitor without the board chrome', (path, heading) => {
    renderAt(path, authValue())
    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument()
  })

  it('shows the notice left by a sign-out on the sign-in screen', () => {
    renderAt('/sign-in', authValue({ notice: { text: 'You are signed out.', kind: 'ok' } }))
    expect(screen.getByRole('status')).toHaveTextContent('You are signed out.')
  })

  it('tells a visitor without a session how to reach set-password', () => {
    renderAt('/set-password', authValue())
    expect(screen.getByText(/Open the link from your invite or password-reset email/)).toBeInTheDocument()
  })
})
