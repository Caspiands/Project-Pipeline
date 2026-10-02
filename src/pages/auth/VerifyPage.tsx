import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'
import { AuthMessage } from '@/components/AuthMessage'
import { CheckingScreen } from '@/components/CheckingScreen'
import { useAuth, type Notice } from '@/lib/auth/auth'
import { normaliseCode } from '@/lib/auth/code'
import { FunctionError, sendCode, verifyCode } from '@/lib/auth/functions'
import { useDeactivatedSignOut } from '@/lib/auth/guards'
import { AUTH_COPY } from '@/lib/auth/messages'
import { otpSentKey } from '@/lib/auth/mfaStatus'

const RESEND_COOLDOWN_SECONDS = 60

function readSentFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
function writeSentFlag(key: string) {
  try {
    sessionStorage.setItem(key, '1')
  } catch {
    /* sessionStorage unavailable */
  }
}

export function VerifyPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const deactivated = useDeactivatedSignOut(auth.status)

  const [code, setCode] = useState('')
  const [lead, setLead] = useState<string>(AUTH_COPY.codeSentFallback)
  const [message, setMessage] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const autoSentFor = useRef<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const doSend = useCallback(async (key: string) => {
    setMessage(null)
    try {
      const r = await sendCode()
      writeSentFlag(key)
      const minutes = Math.round((r.expires_in_seconds ?? 600) / 60)
      setLead(AUTH_COPY.codeSent(r.email_hint ?? 'your email', minutes))
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (e) {
      const err = e as FunctionError
      setMessage({ text: err.message, kind: 'err' })
      if (err.retryAfter) setCooldown(err.retryAfter)
    }
  }, [])

  // Send the code once per login session. A reload does not resend: sessionStorage remembers it.
  const sessionId = auth.sessionId
  const readyToSend =
    !!auth.session && !!sessionId && !!auth.status && !auth.status.verified && auth.status.role !== null
  useEffect(() => {
    if (!readyToSend || autoSentFor.current === sessionId) return
    autoSentFor.current = sessionId
    const key = otpSentKey(sessionId)
    if (readSentFlag(key)) {
      setLead(AUTH_COPY.codeSentFallback)
      return
    }
    void doSend(key)
  }, [readyToSend, sessionId, doSend])

  const submit = useCallback(
    async (value: string) => {
      if (!/^\d{6}$/.test(value)) {
        setMessage({ text: AUTH_COPY.enterCode, kind: 'err' })
        return
      }
      setBusy(true)
      setMessage(null)
      try {
        await verifyCode(value)
        setCode('')
        auth.setNotice(null)
        await auth.refreshStatus()
        navigate('/overview', { replace: true })
      } catch (e) {
        const err = e as FunctionError
        setMessage({ text: err.message, kind: 'err' })
        if (err.expired) setCode('')
        if (err.retryAfter) setCooldown(err.retryAfter)
        inputRef.current?.focus()
      } finally {
        setBusy(false)
      }
    },
    [auth, navigate],
  )

  if (auth.loading) return <CheckingScreen />
  if (!auth.session) return <Navigate to="/sign-in" replace />
  if (auth.needsPassword) return <Navigate to="/set-password" replace />
  if (deactivated) return <CheckingScreen text="Signing you out…" />
  if (auth.status?.verified) return <Navigate to="/overview" replace />

  const onInput = (raw: string) => {
    const v = normaliseCode(raw)
    setCode(v)
    if (v.length === 6 && !busy) void submit(v)
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submit(code)
  }
  const resend = () => {
    if (cooldown > 0 || busy) return
    void doSend(otpSentKey(sessionId))
  }

  return (
    <AuthLayout>
      <h2>Check your email</h2>
      <p>{lead}</p>
      <form noValidate onSubmit={onSubmit}>
        <label className="field">
          <span>6-digit code</span>
          <input
            ref={inputRef}
            className="otp-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            pattern="[0-9 ]*"
            autoFocus
            value={code}
            disabled={busy}
            onChange={(e) => onInput(e.target.value)}
          />
        </label>
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Checking…' : 'Verify and open the board'}
        </button>
        <div className="row">
          <button
            type="button"
            className="linkbtn"
            onClick={resend}
            aria-disabled={cooldown > 0 || busy}
            disabled={cooldown > 0 || busy}
          >
            {cooldown > 0 ? AUTH_COPY.resendIn(cooldown) : AUTH_COPY.resend}
          </button>
          <button type="button" className="linkbtn" onClick={() => void auth.signOut(null)}>
            Use a different account
          </button>
        </div>
      </form>
      <AuthMessage notice={message ?? auth.notice} style={{ marginTop: 14 }} />
    </AuthLayout>
  )
}
