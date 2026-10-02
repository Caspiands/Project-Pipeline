import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { queryClient } from './lib/queryClient'
import { ThemeProvider } from './lib/ThemeProvider'
import { routerFuture, routes } from './router'

function renderAt(path: string) {
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [path], future: routerFuture })
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={memoryRouter} future={{ v7_startTransition: true }} />
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

describe('app shell and routes', () => {
  it('redirects the root to the overview and shows all six tabs', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Overview', 'Pipeline', 'Review', 'Prospects', 'Targets', 'Team & access'])
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 2, name: 'Overview' })).toBeInTheDocument()
  })

  it.each([
    ['/pipeline', 'Pipeline'],
    ['/review', 'Pipeline review'],
    ['/prospects', 'Prospects not yet in the pipeline'],
    ['/targets', 'Company target'],
    ['/team', 'Team & access'],
  ])('renders a placeholder at %s', (path, heading) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument()
    expect(screen.getByText(/Coming in phase/)).toBeInTheDocument()
  })

  it.each([
    ['/sign-in', 'Sign in'],
    ['/verify', 'Check your email'],
    ['/reset', 'Reset your password'],
    ['/set-password', 'Set your password'],
  ])('renders the auth screen at %s without the board chrome', (path, heading) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument()
  })

  it('shows a not-found message for unknown addresses', () => {
    renderAt('/nowhere')
    expect(screen.getByRole('heading', { level: 2, name: 'There is nothing at this address' })).toBeInTheDocument()
  })
})
