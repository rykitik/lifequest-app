import { Suspense, lazy } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/shared/components/BottomNav'
import { ScreenLoadingFallback } from '@/shared/components/ScreenLoadingFallback'
import { useFeedbackStore } from '@/stores/useFeedbackStore'
import { usePromptCenterStore } from '@/stores/usePromptCenterStore'
import { useRescueStore } from '@/stores/useRescueStore'

const PromptCenterSheet = lazy(async () => {
  const module = await import('@/features/prompt-center/components/PromptCenterSheet')

  return {
    default: module.PromptCenterSheet,
  }
})

const RescueModal = lazy(async () => {
  const module = await import('@/features/rescue/components/RescueModal')

  return {
    default: module.RescueModal,
  }
})

const RewardToast = lazy(async () => {
  const module = await import('@/features/progress/components/RewardToast')

  return {
    default: module.RewardToast,
  }
})

export function AppShell() {
  const isPromptCenterOpen = usePromptCenterStore((state) => state.isOpen)
  const isRescueOpen = useRescueStore((state) => state.isOpen)
  const hasRewardToast = useFeedbackStore((state) => Boolean(state.rewardToast))

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
            <Outlet />
          </Suspense>
        </main>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-1/2 z-30 w-full max-w-[30rem] -translate-x-1/2 px-3.5 safe-bottom sm:px-4">
        <div className="pointer-events-auto">
          <BottomNav />
        </div>
      </div>

      {isRescueOpen ? (
        <Suspense fallback={null}>
          <RescueModal />
        </Suspense>
      ) : null}

      {isPromptCenterOpen ? (
        <Suspense fallback={null}>
          <PromptCenterSheet />
        </Suspense>
      ) : null}

      {hasRewardToast ? (
        <Suspense fallback={null}>
          <RewardToast />
        </Suspense>
      ) : null}
    </div>
  )
}
