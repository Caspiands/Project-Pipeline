import { describe, expect, it } from 'vitest'
import { missingEnv, readEnv } from './env'

describe('environment variables', () => {
  it('lists the variables that are missing', () => {
    expect(missingEnv(readEnv({}))).toEqual(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])
    expect(missingEnv(readEnv({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321' }))).toEqual(['VITE_SUPABASE_ANON_KEY'])
    expect(missingEnv(readEnv({ VITE_SUPABASE_URL: ' x ', VITE_SUPABASE_ANON_KEY: 'k' }))).toEqual([])
  })
  it('trims whitespace', () => {
    expect(readEnv({ VITE_SUPABASE_URL: ' http://a ', VITE_SUPABASE_ANON_KEY: ' k ' })).toEqual({
      supabaseUrl: 'http://a',
      supabaseAnonKey: 'k',
    })
  })
})
