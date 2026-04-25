import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { BodyScreen } from '@/features/body/screens/BodyScreen'
import { MoneyScreen } from '@/features/money/screens/MoneyScreen'
import { PlanScreen } from '@/features/plan/screens/PlanScreen'
import { CoreScreen } from '@/features/progress/screens/CoreScreen'
import { TodayScreen } from '@/features/today/screens/TodayScreen'
import { AppShell } from '@/shared/components/AppShell'
import { RouteErrorBoundary } from '@/shared/components/RouteErrorBoundary'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate replace to="/today" />,
      },
      {
        path: 'today',
        element: <TodayScreen />,
      },
      {
        path: 'plan',
        element: <PlanScreen />,
      },
      {
        path: 'body',
        element: <BodyScreen />,
      },
      {
        path: 'money',
        element: <MoneyScreen />,
      },
      {
        path: 'core',
        element: <CoreScreen />,
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
