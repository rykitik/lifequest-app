import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useFeedbackStore } from '@/stores/useFeedbackStore'

const sectorLabels = {
  focus: 'Фокус',
  body: 'Тело',
  money: 'Деньги',
  stability: 'Стабильность',
  energy: 'Энергия',
}

export function RewardToast() {
  const rewardToast = useFeedbackStore((state) => state.rewardToast)
  const dismissRewardToast = useFeedbackStore((state) => state.dismissRewardToast)

  useEffect(() => {
    if (!rewardToast) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      dismissRewardToast()
    }, 2400)

    return () => window.clearTimeout(timeoutId)
  }, [dismissRewardToast, rewardToast])

  return (
    <AnimatePresence>
      {rewardToast ? (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-full max-w-[26rem] rounded-3xl border border-primary/30 bg-slate-950/88 px-4 py-3 shadow-glow backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-primary/25 bg-primary/15 p-2 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  +{rewardToast.xp} XP в сектор «{sectorLabels[rewardToast.sector]}»
                </p>
                <p className="text-xs text-muted">
                  {rewardToast.recoveryXp > 0
                    ? `Возврат тоже засчитан: +${rewardToast.recoveryXp} Recovery XP`
                    : 'Шаг записан в систему и усиливает базу.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
