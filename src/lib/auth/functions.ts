import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** An error from one of the Edge Functions, with the extra fields they return. */
export class FunctionError extends Error {
  status: number
  retryAfter?: number
  expired?: boolean
  remaining?: number

  constructor(message: string, status: number, extra: Record<string, unknown> = {}) {
    super(message)
    this.name = 'FunctionError'
    this.status = status
    if (typeof extra.retry_after === 'number') this.retryAfter = extra.retry_after
    if (typeof extra.expired === 'boolean') this.expired = extra.expired
    if (typeof extra.remaining === 'number') this.remaining = extra.remaining
  }
}

/** Turns a body like `{ error, retry_after, expired }` into a FunctionError with a readable message. */
export function functionErrorFromBody(body: unknown, status: number, fallback: string): FunctionError {
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const message = typeof b.error === 'string' && b.error ? b.error : fallback
  return new FunctionError(message, status, b)
}

async function toFunctionError(error: unknown, fallback: string): Promise<FunctionError> {
  if (error instanceof FunctionsHttpError) {
    let body: unknown = {}
    try {
      body = await error.context.json()
    } catch {
      /* no JSON body */
    }
    return functionErrorFromBody(body, error.context.status, fallback)
  }
  const message = error instanceof Error && error.message ? error.message : fallback
  return new FunctionError(message, 0)
}

export interface SendCodeResult {
  sent: boolean
  email_hint?: string
  expires_in_seconds?: number
}

export interface VerifyCodeResult {
  verified: boolean
  expires_at: string
  role: 'admin' | 'editor' | 'viewer'
}

/** Emails a 6-digit code for the current login session (mfa-send). */
export async function sendCode(): Promise<SendCodeResult> {
  const { data, error } = await supabase.functions.invoke<SendCodeResult>('mfa-send', { body: {} })
  if (error) throw await toFunctionError(error, 'Could not send the code.')
  return data ?? { sent: true }
}

/** Checks the code for the current login session (mfa-verify). */
export async function verifyCode(code: string): Promise<VerifyCodeResult> {
  const { data, error } = await supabase.functions.invoke<VerifyCodeResult>('mfa-verify', { body: { code } })
  if (error) throw await toFunctionError(error, 'Could not check the code.')
  if (!data) throw new FunctionError('Could not check the code.', 0)
  return data
}
