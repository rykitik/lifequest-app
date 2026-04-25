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
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-shell-grid opacity-90" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-56 w-56 rounded-full bg-cyan/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-[30rem] flex-col px-4 safe-top">
        <main className="relative z-10 flex-1 pb-32">
          <Suspense fallback={<ScreenLoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-1/2 z-30 w-full max-w-[30rem] -translate-x-1/2 px-4 safe-bottom">
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
