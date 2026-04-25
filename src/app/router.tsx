import { lazy } from 'react'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/shared/components/AppShell'
import { RouteErrorBoundary } from '@/shared/components/RouteErrorBoundary'

const TodayScreen = lazy(async () => {
  const module = await import('@/features/today/screens/TodayScreen')

  return {
    default: module.TodayScreen,
  }
})

const PlanScreen = lazy(async () => {
  const module = await import('@/features/plan/screens/PlanScreen')

  return {
    default: module.PlanScreen,
  }
})

const BodyScreen = lazy(async () => {
  const module = await import('@/features/body/screens/BodyScreen')

  return {
    default: module.BodyScreen,
  }
})

const MoneyScreen = lazy(async () => {
  const module = await import('@/features/money/screens/MoneyScreen')

  return {
    default: module.MoneyScreen,
  }
})

const CoreScreen = lazy(async () => {
  const module = await import('@/features/progress/screens/CoreScreen')

  return {
    default: module.CoreScreen,
  }
})

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
