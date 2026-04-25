import type { LucideIcon } from 'lucide-react'
import { BatteryCharging, HeartPulse, ShieldCheck, Target, Wallet } from 'lucide-react'
import { LinearProgress } from '@/shared/components/LinearProgress'
import type { SectorKey, SectorProgress } from '@/shared/types'

interface SectorStripProps {
  sectors: SectorProgress[]
}

const icons: Record<SectorKey, LucideIcon> = {
  focus: Target,
  body: HeartPulse,
  money: Wallet,
  stability: ShieldCheck,
  energy: BatteryCharging,
}

export function SectorStrip({ sectors }: SectorStripProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Прогресс секторов</p>
        <p className="text-xs text-muted">Рост виден, давления нет</p>
      </div>

      <div className="thin-scrollbar flex gap-3 overflow-x-auto pb-1">
        {sectors.map((sector) => {
          const Icon = icons[sector.key]

          return (
            <div
              key={sector.key}
              className="glass-card min-w-[9.25rem] rounded-3xl border border-white/10 p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <div
                  className="rounded-2xl border border-white/10 p-2"
                  style={{ color: sector.color }}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                </div>
                <span className="text-sm font-medium text-white">{sector.percent}%</span>
              </div>
              <p className="font-display text-base font-semibold text-white">{sector.label}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">
                Уровень {sector.level}
              </p>
              <LinearProgress
                value={sector.percent}
                className="mt-4"
                barClassName="bg-gradient-to-r from-white via-primary to-cyan"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
