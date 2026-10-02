import { createContext, useContext } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'cdspb.theme'
const ORDER: ThemeChoice[] = ['system', 'light', 'dark']

export interface ThemeContextValue {
  choice: ThemeChoice
  setChoice: (c: ThemeChoice) => void
  cycle: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function readStoredTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

/**
 * Applies the chosen theme by setting `data-theme` on <html>. The prototype's CSS already
 * handles the three cases: no attribute follows the operating system, "light" and "dark" force one.
 */
export function applyTheme(choice: ThemeChoice, root: HTMLElement = document.documentElement) {
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
}

export function nextTheme(choice: ThemeChoice): ThemeChoice {
  return ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length]
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
