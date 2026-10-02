/**
 * Supabase invite and recovery emails land on /set-password with `#access_token=…&type=invite`
 * (or `type=recovery`) in the URL. The Supabase client removes that hash as soon as it has read
 * the tokens, so the type is captured here, before the client is created (this module is the
 * first import in main.tsx).
 */
export type LinkType = 'invite' | 'recovery' | null

function readLinkType(): LinkType {
  if (typeof window === 'undefined') return null
  const t = new URLSearchParams(window.location.hash.slice(1)).get('type')
  return t === 'invite' || t === 'recovery' ? t : null
}

export const LINK_TYPE: LinkType = readLinkType()
