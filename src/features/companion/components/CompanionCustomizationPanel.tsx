import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Radio } from 'lucide-react'
import {
  buildCompanionCustomizationDraft,
  companionAccentPresets,
  companionDisplayNameMaxLength,
  companionShellPresets,
  getCompanionAccentPreset,
  getCompanionShellPreset,
} from '@/features/companion/lib/customization'
import { saveCompanionCustomization } from '@/services/companionCustomization'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { cn } from '@/shared/lib/cn'
import type { CompanionAccent, CompanionCustomization, CompanionShell, CompanionState } from '@/shared/types'

interface CompanionCustomizationPanelProps {
  customization: CompanionCustomization
  mood: CompanionState
  message: string
  level: number
  stabilityScore: number
  currentXp: number
  nextLevelXp: number
  expanded?: boolean
  initialExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

const shellPreviewClasses: Record<
  CompanionShell,
  {
    surface: string
    ring: string
    innerRing: string
    scan: string
    pulse: string
    particles: number
  }
> = {
  system: {
    surface: 'bg-slate-950/70',
    ring: 'border-solid border-white/20',
    innerRing: 'border-dashed border-cyan/35',
    scan: 'opacity-65',
    pulse: 'animate-pulse motion-reduce:animate-none',
    particles: 4,
  },
  deepSpace: {
    surface: 'bg-[#050816]',
    ring: 'scale-95 border-dotted border-indigo-200/25',
    innerRing: 'border-solid border-violet-300/20',
    scan: 'opacity-35',
    pulse: 'animate-pulse motion-reduce:animate-none',
    particles: 3,
  },
  neonFocus: {
    surface: 'bg-slate-950',
    ring: 'border-solid border-cyan/55 shadow-[0_0_32px_rgba(34,211,238,0.28)]',
    innerRing: 'border-dashed border-white/35',
    scan: 'opacity-90',
    pulse: 'animate-pulse motion-reduce:animate-none',
    particles: 6,
  },
  calmSignal: {
    surface: 'bg-slate-900/75',
    ring: 'scale-90 border-solid border-sky-100/20',
    innerRing: 'border-solid border-cyan/18',
    scan: 'opacity-25',
    pulse: 'motion-reduce:animate-none',
    particles: 2,
  },
}

const particlePositions = [
  'left-[18%] top-[24%]',
  'right-[18%] top-[28%]',
  'left-[22%] bottom-[24%]',
  'right-[24%] bottom-[22%]',
  'left-1/2 top-[13%]',
  'right-[12%] top-1/2',
]

const moodPreviewCopy: Record<CompanionState, { title: string; caption: string }> = {
  idle: { title: 'Оператор на связи', caption: 'Core стабилен.' },
  focused: { title: 'Фокус активен', caption: 'Сигнал чистый.' },
  low_energy: { title: 'Бережный режим', caption: 'Снижаем нагрузку.' },
  overloaded: { title: 'Узкий контур', caption: 'Оставляем один мягкий шаг.' },
  recovering: { title: 'Восстановление', caption: 'Система возвращается в центр.' },
  evolving: { title: 'Виток Core', caption: 'Сигналы собираются.' },
}

function CompanionCustomizationPreview({
  customization,
  mood,
}: {
  customization: CompanionCustomization
  mood: CompanionState
}) {
  const accent = getCompanionAccentPreset(customization.accent)
  const shell = getCompanionShellPreset(customization.shell)
  const visual = shellPreviewClasses[shell.id]
  const moodCopy = moodPreviewCopy[mood]

  return (
    <div
      className={cn(
        'relative min-w-[260px] overflow-hidden rounded-3xl border border-white/10 p-4',
        visual.surface,
      )}
      data-preview-accent={accent.id}
      data-preview-shell={shell.id}
      style={{
        backgroundImage: `radial-gradient(circle at 50% 38%, ${accent.glow}22 0%, transparent 44%), radial-gradient(circle at 20% 20%, ${accent.secondaryGlow}14 0%, transparent 38%)`,
      }}
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
      <div className="flex min-w-0 flex-col items-center gap-3 text-center">
        <div className="relative flex h-36 w-full max-w-[320px] items-center justify-center">
          <div
            className={cn('absolute h-32 w-32 rounded-full border', visual.ring, visual.pulse)}
            style={{ boxShadow: `0 0 44px ${accent.glow}24, inset 0 0 22px ${accent.secondaryGlow}14` }}
          />
          <div className={cn('absolute h-24 w-24 rounded-full border', visual.innerRing)} />
          <div
            className={cn('absolute h-28 w-28 rounded-full', visual.scan)}
            style={{
              background: `conic-gradient(from 25deg, transparent 0deg, ${accent.glow} 42deg, transparent 68deg, transparent 185deg, ${accent.secondaryGlow}99 210deg, transparent 238deg)`,
              WebkitMask:
                'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
            }}
          />
          {particlePositions.slice(0, visual.particles).map((position) => (
            <span
              aria-hidden="true"
              className={cn('absolute h-1.5 w-1.5 rounded-full', position)}
              key={position}
              style={{
                background: accent.glow,
                boxShadow: `0 0 12px ${accent.glow}`,
              }}
            />
          ))}
          <div
            className="relative h-16 w-16 rounded-full border border-white/15"
            style={{
              background: `radial-gradient(circle at 34% 28%, #ffffff 0%, ${accent.secondaryGlow} 14%, ${accent.glow}92 42%, rgba(11,16,32,0.92) 76%)`,
              boxShadow: `0 0 34px ${accent.glow}88, inset 0 0 18px ${accent.secondaryGlow}35`,
            }}
          />
        </div>

        <div className="min-w-0">
          <p className="break-words font-display text-lg font-bold leading-tight text-white">
            {customization.displayName}
          </p>
          <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-200">
            {moodCopy.title}
          </p>
          <p className="mt-0.5 break-words text-xs leading-4 text-muted">{moodCopy.caption}</p>
        </div>

        <p className="max-w-full rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] leading-4 text-muted">
          Preview · {shell.label} / {accent.caption}
        </p>
      </div>
    </div>
  )
}

export function CompanionCustomizationPanel({
  customization,
  mood,
  level,
  stabilityScore,
  currentXp,
  nextLevelXp,
  expanded,
  initialExpanded = false,
  onExpandedChange,
}: CompanionCustomizationPanelProps) {
  const [draft, setDraft] = useState(customization)
  const [localExpanded, setLocalExpanded] = useState(initialExpanded)
  const isExpanded = expanded ?? localExpanded
  const selectedAccent = getCompanionAccentPreset(draft.accent)
  const selectedShell = getCompanionShellPreset(draft.shell)

  const setExpanded = (nextExpanded: boolean) => {
    if (expanded === undefined) {
      setLocalExpanded(nextExpanded)
    }

    onExpandedChange?.(nextExpanded)
  }

  const updateDraft = (nextDraft: Partial<CompanionCustomization>) => {
    setDraft((current) =>
      buildCompanionCustomizationDraft({
        ...current,
        ...nextDraft,
      }),
    )
  }

  const handleSave = () => {
    const savedCustomization = saveCompanionCustomization(draft)

    setDraft(savedCustomization)
  }

  return (
    <GlassCard className="mb-5 overflow-hidden border-cyan/20 bg-gradient-to-br from-cyan/10 via-primary/8 to-transparent !p-3.5">
      <div className="pointer-events-none -mx-3.5 -mt-3.5 mb-3 h-px bg-gradient-to-r from-transparent via-cyan/45 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan/80">
            Персонализация Core
          </p>
          <h2 className="mt-1.5 break-words font-display text-base font-semibold leading-tight text-white">
            Companion Core
          </h2>
          <p className="mt-1.5 break-words text-[13px] leading-5 text-muted">
            {customization.displayName} · {selectedShell.label} · {selectedAccent.caption}
          </p>
        </div>
        <button
          aria-expanded={isExpanded}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-2xl border border-cyan/25 bg-cyan/10 px-3 text-xs font-medium text-cyan transition hover:border-cyan/45 hover:bg-cyan/15"
          type="button"
          onClick={() => setExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {isExpanded ? 'Свернуть' : 'Настроить'}
        </button>
      </div>

      {isExpanded ? (
        <div className="mt-4 grid grid-cols-1 gap-3">
          <CompanionCustomizationPreview customization={draft} mood={mood} />

          <div className="grid grid-cols-3 gap-2">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-[9px] uppercase tracking-[0.12em] text-muted">Уровень</p>
              <p className="mt-1 text-sm font-semibold text-white">{level}</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-[9px] uppercase tracking-[0.12em] text-muted">Стабильность</p>
              <p className="mt-1 text-sm font-semibold text-white">{stabilityScore}%</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-[9px] uppercase tracking-[0.12em] text-muted">XP</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {currentXp}/{nextLevelXp}
              </p>
            </div>
          </div>

          <label className="block min-w-0">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              Имя Core
            </span>
            <input
              className="mt-1.5 w-full min-w-0 rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-muted focus:border-cyan/40"
              value={draft.displayName}
              maxLength={companionDisplayNameMaxLength + 8}
              onChange={(event) => updateDraft({ displayName: event.target.value })}
              placeholder="Companion Core"
            />
          </label>

          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Цвет</p>
            <div className="mt-2 grid grid-cols-2 gap-2 min-[430px]:grid-cols-3">
              {companionAccentPresets.map((preset) => {
                const selected = preset.id === draft.accent

                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-label={`Цвет Core: ${preset.label}`}
                    className={cn(
                      'min-w-0 rounded-2xl border bg-black/18 px-2.5 py-2 text-left transition',
                      selected ? 'border-cyan/35 bg-cyan/10' : 'border-white/10 hover:border-white/20',
                    )}
                    onClick={() => updateDraft({ accent: preset.id as CompanionAccent })}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full"
                        style={{
                          background: preset.glow,
                          boxShadow: `0 0 14px ${preset.glow}88`,
                        }}
                      />
                      <span className="min-w-0 break-words text-xs font-semibold text-white">
                        {preset.label}
                      </span>
                    </span>
                    <span className="mt-1 block break-words text-[11px] text-muted">
                      {preset.caption}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Оболочка</p>
            <div className="mt-2 grid gap-2">
              {companionShellPresets.map((preset) => {
                const selected = preset.id === draft.shell

                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-label={`Оболочка Core: ${preset.label}`}
                    className={cn(
                      'flex min-w-0 items-start gap-2 rounded-2xl border bg-black/18 px-3 py-2.5 text-left transition',
                      selected ? 'border-cyan/35 bg-cyan/10' : 'border-white/10 hover:border-white/20',
                    )}
                    onClick={() => updateDraft({ shell: preset.id as CompanionShell })}
                  >
                    {selected ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                    ) : (
                      <Radio className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                    )}
                    <span className="min-w-0">
                      <span className="block break-words text-sm font-semibold text-white">
                        {preset.label}
                      </span>
                      <span className="mt-0.5 block break-words text-xs leading-4 text-muted">
                        {preset.caption}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted">
              Текущая конфигурация
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-white">
              {draft.displayName} · {selectedShell.label} · {selectedAccent.caption}
            </p>
          </div>

          <PrimaryButton fullWidth className="!min-h-11 !py-2.5" onClick={handleSave}>
            Сохранить Core
          </PrimaryButton>
        </div>
      ) : (
        <p className="mt-3 break-words text-[13px] leading-5 text-muted">
          Настройки не занимают главный экран. Будущие формы добавят новые оболочки Core.
        </p>
      )}
    </GlassCard>
  )
}
