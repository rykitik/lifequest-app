import { Suspense, lazy } from 'react'
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

export function AppOverlays() {
  const isPromptCenterOpen = usePromptCenterStore((state) => state.isOpen)
  const isRescueOpen = useRescueStore((state) => state.isOpen)
  const hasRewardToast = useFeedbackStore((state) => Boolean(state.rewardToast))

  return (
    <>
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
    </>
  )
}
