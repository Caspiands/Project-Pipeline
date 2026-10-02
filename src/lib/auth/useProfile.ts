import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './auth'

export interface MyProfile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'editor' | 'viewer'
  is_active: boolean
}

/** The signed-in person's own profile row (readable even before the code step). */
export function useProfile() {
  const { session } = useAuth()
  const uid = session?.user.id ?? ''
  return useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async (): Promise<MyProfile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active')
        .eq('id', uid)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
  })
}
