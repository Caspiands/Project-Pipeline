import { describe, expect, it } from 'vitest'
import { normaliseCode } from './code'
import { functionErrorFromBody } from './functions'
import { jwtPayload, sessionIdFromToken } from './jwt'
import { signInErrorMessage } from './messages'
import { parseMfaStatus } from './mfaStatus'
import { passwordSchema, signInSchema } from './schemas'

const payload = { sub: 'u1', role: 'authenticated', session_id: 'afee7dd9-6352-4f05-a062-7d78a1a8e739' }
const token = `eyJhbGciOiJFUzI1NiJ9.${btoa(JSON.stringify(payload)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.sig`

describe('jwt', () => {
  it('reads the session id from the access token', () => {
    expect(jwtPayload(token).sub).toBe('u1')
    expect(sessionIdFromToken(token)).toBe('afee7dd9-6352-4f05-a062-7d78a1a8e739')
  })
  it('returns empty values for rubbish', () => {
    expect(jwtPayload('nope')).toEqual({})
    expect(sessionIdFromToken(null)).toBe('')
  })
})

describe('my_mfa_status parsing', () => {
  it('reads verified, role and expiry', () => {
    expect(parseMfaStatus({ verified: true, role: 'admin', expires_at: '2026-10-02T18:00:00+00:00' })).toEqual({
      verified: true,
      role: 'admin',
      expiresAt: '2026-10-02T18:00:00+00:00',
    })
  })
  it('treats a missing role as no access', () => {
    expect(parseMfaStatus({ verified: true, role: null, expires_at: null })).toEqual({
      verified: true,
      role: null,
      expiresAt: null,
    })
    expect(parseMfaStatus(null)).toEqual({ verified: false, role: null, expiresAt: null })
  })
})

describe('function errors', () => {
  it('keeps the server message and the retry/expired hints', () => {
    const e = functionErrorFromBody(
      { error: 'Wait 42 seconds before asking for another code.', retry_after: 42 },
      429,
      'x',
    )
    expect(e.message).toBe('Wait 42 seconds before asking for another code.')
    expect(e.status).toBe(429)
    expect(e.retryAfter).toBe(42)
    const f = functionErrorFromBody(
      { error: 'That code is not right. 4 tries left.', remaining: 4, expired: false },
      400,
      'x',
    )
    expect(f.remaining).toBe(4)
    expect(f.expired).toBe(false)
  })
  it('falls back to a plain message when the body is not useful', () => {
    expect(functionErrorFromBody('oops', 502, 'Could not send the code.').message).toBe('Could not send the code.')
  })
})

describe('copy', () => {
  it('never reveals whether an email exists', () => {
    expect(signInErrorMessage('Invalid login credentials')).toBe('That email and password do not match.')
    expect(signInErrorMessage('Email not confirmed')).toBe('That email and password do not match.')
    expect(signInErrorMessage('Request rate limit reached')).toBe('Request rate limit reached')
  })
  it('normalises typed and pasted codes', () => {
    expect(normaliseCode('123 456')).toBe('123456')
    expect(normaliseCode('12a3')).toBe('123')
    expect(normaliseCode('1234567')).toBe('123456')
  })
})

describe('form rules', () => {
  it('requires both email and password', () => {
    expect(signInSchema.safeParse({ email: '', password: '' }).success).toBe(false)
    expect(signInSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
  })
  it('wants a password of at least 10 characters, typed twice the same', () => {
    expect(passwordSchema.safeParse({ password: 'short', confirm: 'short' }).success).toBe(false)
    expect(passwordSchema.safeParse({ password: 'longenough1', confirm: 'different1' }).success).toBe(false)
    expect(passwordSchema.safeParse({ password: 'longenough1', confirm: 'longenough1' }).success).toBe(true)
  })
})
