import { useTheme, type ThemeChoice } from '@/lib/theme'

const LABELS: Record<ThemeChoice, string> = {
  system: 'Theme: follows your device',
  light: 'Theme: light',
  dark: 'Theme: dark',
}

const SHORT: Record<ThemeChoice, string> = { system: 'Auto', light: 'Light', dark: 'Dark' }

function Icon({ choice }: { choice: ThemeChoice }) {
  if (choice === 'light') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
      </svg>
    )
  }
  if (choice === 'dark') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Cycles Auto → Light → Dark. The choice is remembered in this browser. */
export function ThemeToggle() {
  const { choice, cycle } = useTheme()
  return (
    <button type="button" className="ghost theme-toggle" onClick={cycle} aria-label={LABELS[choice]} title={LABELS[choice]}>
      <Icon choice={choice} />
      <span>{SHORT[choice]}</span>
    </button>
  )
}
