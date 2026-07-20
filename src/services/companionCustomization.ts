import type { CompanionCustomization } from '@/shared/types'
import { normalizeCompanionCustomization } from '@/features/companion/lib/customization'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useFeedbackStore } from '@/stores/useFeedbackStore'

export function saveCompanionCustomization(input: Partial<CompanionCustomization>) {
  const customization = normalizeCompanionCustomization({
    ...useCompanionStore.getState().customization,
    ...input,
    updatedAt: new Date().toISOString(),
  })
  const savedCustomization = useCompanionStore.getState().updateCustomization(customization)

  useCompanionStore.getState().setActiveMessage('Конфигурация принята.')
  useCompanionStore.getState().triggerProgressReaction('Конфигурация принята.')
  useFeedbackStore.getState().showSystemToast('Core обновлён.', 'Конфигурация принята.')

  return savedCustomization
}
