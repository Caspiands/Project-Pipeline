import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { ThemeProvider } from './ThemeProvider'
import { applyTheme, nextTheme, useTheme } from './theme'

function Probe() {
  const { choice, cycle } = useTheme()
  return (
    <button type="button" onClick={cycle}>
      {choice}
    </button>
  )
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('cycles system → light → dark → system', () => {
    expect(nextTheme('system')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('system')
  })

  it('sets data-theme on <html> only when a theme is forced', () => {
    const root = document.createElement('html')
    applyTheme('dark', root)
    expect(root.getAttribute('data-theme')).toBe('dark')
    applyTheme('light', root)
    expect(root.getAttribute('data-theme')).toBe('light')
    applyTheme('system', root)
    expect(root.hasAttribute('data-theme')).toBe(false)
  })

  it('remembers the choice in localStorage and applies it to the document', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    const btn = screen.getByRole('button')
    expect(btn).toHaveTextContent('system')
    act(() => btn.click())
    expect(btn).toHaveTextContent('light')
    expect(localStorage.getItem('cdspb.theme')).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    act(() => btn.click())
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    act(() => btn.click())
    expect(localStorage.getItem('cdspb.theme')).toBeNull()
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
})
