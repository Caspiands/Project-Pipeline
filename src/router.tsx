import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { RequireVerified } from '@/components/RequireVerified'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ResetPage } from '@/pages/auth/ResetPage'
import { SetPasswordPage } from '@/pages/auth/SetPasswordPage'
import { SignInPage } from '@/pages/auth/SignInPage'
import { VerifyPage } from '@/pages/auth/VerifyPage'
import { OverviewPage } from '@/pages/board/OverviewPage'
import { PipelinePage } from '@/pages/board/PipelinePage'
import { ProspectsPage } from '@/pages/board/ProspectsPage'
import { ReviewPage } from '@/pages/board/ReviewPage'
import { TargetsPage } from '@/pages/board/TargetsPage'
import { TeamPage } from '@/pages/board/TeamPage'

/**
 * Every route from section 3 of the specification. The auth screens sit outside the guard; the
 * board only renders once RequireVerified has confirmed the session passed the emailed code.
 */
export const routes: RouteObject[] = [
  { path: '/sign-in', element: <SignInPage /> },
  { path: '/verify', element: <VerifyPage /> },
  { path: '/reset', element: <ResetPage /> },
  { path: '/set-password', element: <SetPasswordPage /> },
  {
    element: <RequireVerified />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate to="/overview" replace /> },
          { path: '/overview', element: <OverviewPage /> },
          { path: '/pipeline', element: <PipelinePage /> },
          { path: '/review', element: <ReviewPage /> },
          { path: '/prospects', element: <ProspectsPage /> },
          { path: '/targets', element: <TargetsPage /> },
          { path: '/team', element: <TeamPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
} as const

export const router = createBrowserRouter(routes, { future: routerFuture })
