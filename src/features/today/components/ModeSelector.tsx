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
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const Icon = icons[option.key]
        const isActive = option.key === activeMode

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onSelect(option.key)}
            className={cn(
              'glass-card flex min-h-[7.5rem] flex-col rounded-3xl border p-4 text-left transition',
              isActive && 'shadow-glow',
            )}
            style={{
              borderColor: isActive ? `${option.accent}66` : undefined,
              background: isActive
                ? `linear-gradient(180deg, ${option.accent}22 0%, rgba(17,24,39,0.84) 100%)`
                : undefined,
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div
                className="rounded-2xl border border-white/10 p-2"
                style={{ color: option.accent }}
              >
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </div>
              {isActive ? (
                <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                  Активно
                </span>
              ) : null}
            </div>
            <p className="font-display text-base font-semibold text-white">{option.label}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{option.energyHint}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{option.description}</p>
          </button>
        )
      })}
    </div>
  )
}
