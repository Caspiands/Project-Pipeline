import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LINK_TYPE } from '@/lib/linkType'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AuthContextValue, type Notice } from './auth'
import { sessionIdFromToken } from './jwt'
import { AUTH_COPY } from './messages'
import { clearOtpSentFlags, fetchMfaStatus, mfaStatusKey, type MfaStatus } from './mfaStatus'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsPassword, setNeedsPassword] = useState(LINK_TYPE === 'invite' || LINK_TYPE === 'recovery')
  const [notice, setNotice] = useState<Notice | null>(null)
  const sessionId = sessionIdFromToken(session?.access_token)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      // Deferred, as the Supabase docs advise, so nothing awaits inside the auth callback.
      setTimeout(() => {
        if (!active) return
        setSession(next)
        setLoading(false)
        if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true)
      }, 0)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const statusQuery = useQuery({
    queryKey: mfaStatusKey(sessionId),
    queryFn: fetchMfaStatus,
    enabled: !!session && !!sessionId,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  })

  const refreshStatus = useCallback(async (): Promise<MfaStatus | null> => {
    if (!sessionId) return null
    return queryClient.fetchQuery({ queryKey: mfaStatusKey(sessionId), queryFn: fetchMfaStatus, staleTime: 0 })
  }, [queryClient, sessionId])

  const signOut = useCallback(
    async (next: Notice | null = { text: AUTH_COPY.signedOut, kind: 'ok' }) => {
      clearOtpSentFlags()
      await supabase.auth.signOut()
      queryClient.clear()
      setSession(null)
      setNeedsPassword(false)
      setNotice(next)
    },
    [queryClient],
  )

  const passwordSaved = useCallback(() => setNeedsPassword(false), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      sessionId,
      status: session && statusQuery.data ? statusQuery.data : null,
      statusError: session && statusQuery.error ? (statusQuery.error as Error).message : null,
      needsPassword,
      notice,
      refreshStatus,
      signOut,
      setNotice,
      passwordSaved,
    }),
    [
      loading,
      session,
      sessionId,
      statusQuery.data,
      statusQuery.error,
      needsPassword,
      notice,
      refreshStatus,
      signOut,
      passwordSaved,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
