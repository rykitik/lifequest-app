import type { LucideIcon } from 'lucide-react'
import { BatteryLow, Compass, ShieldCheck, Zap } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import type { ModeKey, TodayModeOption } from '@/shared/types'

interface ModeSelectorProps {
  options: TodayModeOption[]
  activeMode: ModeKey
  onSelect: (mode: ModeKey) => void
}

const icons: Record<ModeKey, LucideIcon> = {
  low: BatteryLow,
  stable: ShieldCheck,
  high: Zap,
  drifted: Compass,
}

export function ModeSelector({ options, activeMode, onSelect }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map((option) => {
        const Icon = icons[option.key]
        const isActive = option.key === activeMode

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onSelect(option.key)}
            className={cn(
              'group relative min-h-[6.35rem] overflow-hidden rounded-2xl border bg-white/[0.035] p-2.5 text-left transition',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl',
              isActive ? 'text-white shadow-glow' : 'text-muted hover:border-white/20 hover:bg-white/[0.06]',
            )}
            style={{
              borderColor: isActive ? `${option.accent}66` : undefined,
              background: isActive
                ? `linear-gradient(180deg, ${option.accent}24 0%, rgba(17,24,39,0.72) 100%)`
                : undefined,
              boxShadow: isActive
                ? `0 0 26px ${option.accent}24, inset 0 1px 0 rgba(255,255,255,0.06)`
                : undefined,
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-2 top-0 h-px opacity-0 transition group-hover:opacity-70"
              style={{ background: `linear-gradient(90deg, transparent, ${option.accent}, transparent)` }}
            />
            <div className="mb-2 flex items-center justify-between gap-1">
              <div
                className="rounded-xl border border-white/10 p-1.5"
                style={{
                  color: option.accent,
                  background: isActive ? `${option.accent}18` : 'rgba(255,255,255,0.04)',
                }}
              >
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </div>
              {isActive ? (
                <span
                  className="rounded-full border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em]"
                  style={{ borderColor: `${option.accent}55`, color: option.accent }}
                >
                  Активно
                </span>
              ) : null}
            </div>
            <p className="font-display text-[13px] font-semibold leading-4 text-white">{option.label}</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              {option.energyHint}
            </p>
          </button>
        )
      })}
    </div>
  )
}
