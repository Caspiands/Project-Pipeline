import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { queryClient } from '@/lib/queryClient'
import { ThemeProvider } from '@/lib/ThemeProvider'
import { router } from '@/router'

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
