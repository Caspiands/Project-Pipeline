import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from './auth'
import { useSessionExpiry } from './guards'
import type { MfaStatus } from './mfaStatus'

function Probe({ status }: { status: MfaStatus | null }) {
  useSessionExpiry(status)
  return null
}

function makeAuth(over: Partial<AuthContextValue>): AuthContextValue {
  return {
    loading: false,
    session: null,
    sessionId: 's1',
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

describe('verified session expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-02T10:00:00Z'))
    sessionStorage.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('asks the database again at expires_at and sends the person back to the code step', async () => {
    const refreshStatus = vi.fn(async (): Promise<MfaStatus> => ({ verified: false, role: 'admin', expiresAt: null }))
    const setNotice = vi.fn()
    sessionStorage.setItem('cdspb.otp.s1', '1')
    const auth = makeAuth({ refreshStatus, setNotice })
    render(
      <AuthContext.Provider value={auth}>
        <Probe status={{ verified: true, role: 'admin', expiresAt: '2026-10-02T10:00:30Z' }} />
      </AuthContext.Provider>,
    )
    await act(async () => {
      vi.advanceTimersByTime(29_000)
    })
    expect(refreshStatus).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(1_500)
    })
    expect(refreshStatus).toHaveBeenCalledTimes(1)
    expect(setNotice).toHaveBeenCalledWith({ text: 'Your verified session has ended. Enter a new code.', kind: 'info' })
    // The "code already sent" flag is cleared so /verify emails a fresh code.
    expect(sessionStorage.getItem('cdspb.otp.s1')).toBeNull()
  })

  it('does nothing while the session is not verified', async () => {
    const refreshStatus = vi.fn(async () => null)
    const auth = makeAuth({ refreshStatus })
    render(
      <AuthContext.Provider value={auth}>
        <Probe status={{ verified: false, role: 'admin', expiresAt: null }} />
      </AuthContext.Provider>,
    )
    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    expect(refreshStatus).not.toHaveBeenCalled()
  })

  it('leaves the board open when the database still says verified', async () => {
    const refreshStatus = vi.fn(async (): Promise<MfaStatus> => ({
      verified: true,
      role: 'admin',
      expiresAt: '2026-10-02T10:05:00Z',
    }))
    const setNotice = vi.fn()
    const auth = makeAuth({ refreshStatus, setNotice })
    render(
      <AuthContext.Provider value={auth}>
        <Probe status={{ verified: true, role: 'admin', expiresAt: '2026-10-02T10:00:10Z' }} />
      </AuthContext.Provider>,
    )
    await act(async () => {
      vi.advanceTimersByTime(11_000)
    })
    expect(refreshStatus).toHaveBeenCalledTimes(1)
    expect(setNotice).not.toHaveBeenCalled()
  })
})
