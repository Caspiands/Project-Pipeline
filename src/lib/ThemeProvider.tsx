import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyTheme, nextTheme, readStoredTheme, THEME_STORAGE_KEY, ThemeContext, type ThemeChoice } from './theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStoredTheme)

  useEffect(() => {
    applyTheme(choice)
    try {
      if (choice === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, choice)
    } catch {
      /* storage can be unavailable in private browsing; the theme still applies for this page */
    }
  }, [choice])

  const setChoice = useCallback((c: ThemeChoice) => setChoiceState(c), [])
  const cycle = useCallback(() => setChoiceState((c) => nextTheme(c)), [])
  const value = useMemo(() => ({ choice, setChoice, cycle }), [choice, setChoice, cycle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
