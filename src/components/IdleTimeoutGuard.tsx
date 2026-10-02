import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth/auth'

const IDLE_MS = 30 * 60 * 1000
const WARN_MS = 60 * 1000

/** Signs the user out after 30 minutes idle, with a 60-second warning modal. */
export function IdleTimeoutGuard() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [warn, setWarn] = useState(false)
  const [seconds, setSeconds] = useState(60)
  const idleTimer = useRef<number | null>(null)
  const warnTimer = useRef<number | null>(null)
  const tickTimer = useRef<number | null>(null)

  const clearAll = useCallback(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current)
    if (warnTimer.current) window.clearTimeout(warnTimer.current)
    if (tickTimer.current) window.clearInterval(tickTimer.current)
    idleTimer.current = warnTimer.current = tickTimer.current = null
  }, [])

  const signOutNow = useCallback(async () => {
    clearAll()
    setWarn(false)
    await auth.signOut()
    navigate('/sign-in', { replace: true })
  }, [auth, clearAll, navigate])

  const staySignedIn = useCallback(() => {
    setWarn(false)
    setSeconds(60)
    clearAll()
    scheduleIdle()
  }, [clearAll])

  const scheduleIdle = useCallback(() => {
    clearAll()
    idleTimer.current = window.setTimeout(() => {
      setWarn(true)
      setSeconds(60)
      tickTimer.current = window.setInterval(() => {
        setSeconds((s) => s - 1)
      }, 1000)
      warnTimer.current = window.setTimeout(() => {
        void signOutNow()
      }, WARN_MS)
    }, IDLE_MS - WARN_MS)
  }, [clearAll, signOutNow])

  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    const bump = () => {
      if (!warn) scheduleIdle()
    }
    events.forEach((ev) => window.addEventListener(ev, bump, { passive: true }))
    scheduleIdle()
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, bump))
      clearAll()
    }
  }, [scheduleIdle, clearAll, warn])

  if (!warn) return null

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="idle-title">
      <div className="modal">
        <h2 id="idle-title" style={{ marginTop: 0 }}>Still there?</h2>
        <p className="lead">You will be signed out in {seconds} seconds because there has been no activity for a while.</p>
        <div className="toolbar">
          <button type="button" className="primary" onClick={staySignedIn}>Stay signed in</button>
          <button type="button" className="ghost" onClick={() => void signOutNow()}>Sign out now</button>
        </div>
      </div>
    </div>
  )
}
