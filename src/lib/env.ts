/** Reads the Vite environment variables and reports clearly when one is missing. */
export interface AppEnv {
  supabaseUrl: string
  supabaseAnonKey: string
}

export function readEnv(source: Record<string, string | undefined> = import.meta.env): AppEnv {
  return {
    supabaseUrl: (source.VITE_SUPABASE_URL ?? '').trim(),
    supabaseAnonKey: (source.VITE_SUPABASE_ANON_KEY ?? '').trim(),
  }
}

export function missingEnv(env: AppEnv): string[] {
  const missing: string[] = []
  if (!env.supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!env.supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  return missing
}

export const env = readEnv()
export const isConfigured = missingEnv(env).length === 0
