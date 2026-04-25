import { GlassCard } from '@/shared/components/GlassCard'

export function ScreenLoadingFallback() {
  return (
    <section className="pb-6 pt-3">
      <GlassCard tone="strong" className="overflow-hidden">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Загрузка экрана</p>
        <h2 className="mt-3 font-display text-xl font-semibold text-white">
          Система мягко поднимает следующий модуль
        </h2>
        <p className="mt-2 max-w-xs text-sm leading-6 text-muted">
          Ещё секунду. Маршрут и состояние уже на месте, остаётся только открыть интерфейс.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="h-20 rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
          <div className="h-20 rounded-3xl border border-white/10 bg-white/5 animate-pulse [animation-delay:120ms]" />
          <div className="h-20 rounded-3xl border border-white/10 bg-white/5 animate-pulse [animation-delay:240ms]" />
        </div>

        <div className="mt-5 h-24 rounded-[1.75rem] border border-primary/15 bg-gradient-to-r from-primary/10 via-cyan/5 to-transparent animate-pulse" />
      </GlassCard>
    </section>
  )
}
