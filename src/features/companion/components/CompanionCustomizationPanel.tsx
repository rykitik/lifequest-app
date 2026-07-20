import { useState } from 'react'
import { Check, Radio } from 'lucide-react'
import { CompanionCoreWidget } from '@/features/companion/components/CompanionCoreWidget'
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
}

export function CompanionCustomizationPanel({
  customization,
  mood,
  message,
  level,
  stabilityScore,
  currentXp,
  nextLevelXp,
}: CompanionCustomizationPanelProps) {
  const [draft, setDraft] = useState(customization)
  const selectedAccent = getCompanionAccentPreset(draft.accent)
  const selectedShell = getCompanionShellPreset(draft.shell)

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

      <div className="mb-3 min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan/80">
          Персонализация ядра
        </p>
        <h2 className="mt-1.5 break-words font-display text-base font-semibold leading-tight text-white">
          Настрой имя, цвет и оболочку Companion Core
        </h2>
        <p className="mt-1.5 text-[13px] leading-5 text-muted">
          Будущие формы добавят новые оболочки Core.
        </p>
      </div>

      <div className="grid gap-3 min-[430px]:grid-cols-[9rem_1fr]">
        <div className="min-w-0">
          <CompanionCoreWidget
            mood={mood}
            message={message}
            level={level}
            stabilityScore={stabilityScore}
            currentXp={currentXp}
            nextLevelXp={nextLevelXp}
            variant="compact"
            customization={draft}
            surface="inline"
          />
        </div>

        <div className="min-w-0 space-y-3">
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              Имя Core
            </span>
            <input
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-muted focus:border-cyan/40"
              value={draft.displayName}
              maxLength={companionDisplayNameMaxLength + 8}
              onChange={(event) => updateDraft({ displayName: event.target.value })}
              placeholder="Companion Core"
            />
          </label>

          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              Цвет
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
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
                    <span className="flex items-center gap-2">
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
                    <span className="mt-1 block text-[11px] text-muted">{preset.caption}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              Оболочка
            </p>
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
      </div>
    </GlassCard>
  )
}
