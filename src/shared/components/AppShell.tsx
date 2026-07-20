import { Suspense, lazy, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ScreenLoadingFallback } from '@/shared/components/ScreenLoadingFallback'
import { scheduleAfterFirstPaint } from '@/shared/lib/startup'
import { useSettingsStore } from '@/stores/useSettingsStore'

const BottomNav = lazy(async () => {
  const module = await import('@/shared/components/BottomNav')

  return {
    default: module.BottomNav,
  }
})

const AppOverlays = lazy(async () => {
  const module = await import('@/shared/components/AppOverlays')

  return {
    default: module.AppOverlays,
  }
})

export function AppShell() {
  const onboarding = useSettingsStore((state) => state.onboarding)
  const location = useLocation()
  const navigate = useNavigate()
  const isOnboardingRoute = location.pathname === '/onboarding'
  const shouldRedirectToOnboarding =
    !onboarding.completed && !onboarding.skipped && !isOnboardingRoute && location.pathname !== '/auth'
  const [canLoadRuntimeChrome, setCanLoadRuntimeChrome] = useState(false)
  const shouldShowRuntimeChrome = canLoadRuntimeChrome && !isOnboardingRoute

  useEffect(() => {
    if (!shouldRedirectToOnboarding) {
      return
    }

    navigate('/onboarding', { replace: true })
  }, [navigate, shouldRedirectToOnboarding])

  useEffect(() => {
    if (isOnboardingRoute) {
      return
    }

    return scheduleAfterFirstPaint(() => setCanLoadRuntimeChrome(true), 900)
  }, [isOnboardingRoute])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#030817]">
      <div className="pointer-events-none absolute inset-0 bg-shell-grid opacity-90" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.72),transparent_78%)]" />
      <div className="pointer-events-none absolute left-1/2 top-4 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/16 blur-3xl" />
      <div className="pointer-events-none absolute right-[-5rem] top-28 h-52 w-52 rounded-full bg-cyan/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-[-4rem] h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-[30rem] flex-col px-3.5 safe-top sm:px-4">
        <main className="relative z-10 flex-1 pb-mobile-dock">
          <Suspense fallback={<ScreenLoadingFallback />}>
            {shouldRedirectToOnboarding ? <ScreenLoadingFallback /> : <Outlet />}
          </Suspense>
        </main>
      </div>

      {!isOnboardingRoute ? (
        <div className="pointer-events-none fixed bottom-0 left-1/2 z-30 w-full max-w-[30rem] -translate-x-1/2 px-3.5 safe-bottom sm:px-4">
          <div className="pointer-events-auto">
            {shouldShowRuntimeChrome ? (
              <Suspense fallback={null}>
                <BottomNav />
              </Suspense>
            ) : null}
          </div>
        </div>
      ) : null}

      {shouldShowRuntimeChrome ? (
        <Suspense fallback={null}>
          <AppOverlays />
        </Suspense>
      ) : null}
    </div>
  )
}
