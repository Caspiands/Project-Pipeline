/** Reads the payload of a JWT without checking the signature; the server does that. */
export function jwtPayload(token: string | null | undefined): Record<string, unknown> {
  if (!token) return {}
  try {
    const part = token.split('.')[1] ?? ''
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')
    const json = decodeURIComponent(
      Array.from(atob(padded), (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    )
    const parsed: unknown = JSON.parse(json)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** The login session id Supabase puts in every access token. Codes are bound to it. */
export function sessionIdFromToken(token: string | null | undefined): string {
  const v = jwtPayload(token).session_id
  return typeof v === 'string' ? v : ''
}
