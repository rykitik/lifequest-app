import type { CompanionAccent, CompanionCustomization, CompanionShell } from '@/shared/types'

export const companionDisplayNameFallback = 'Companion Core'
export const companionDisplayNameMaxLength = 24

export interface CompanionAccentPreset {
  id: CompanionAccent
  label: string
  caption: string
  glow: string
  secondaryGlow: string
  textClassName: string
}

export interface CompanionShellPreset {
  id: CompanionShell
  label: string
  caption: string
  auraMultiplier: number
  ringMultiplier: number
  scanMultiplier: number
  pulseMultiplier: number
  nodeOffset: number
  borderClassName: string
}

export const companionAccentPresets: CompanionAccentPreset[] = [
  {
    id: 'cyan',
    label: 'Системный',
    caption: 'Cyan',
    glow: '#22D3EE',
    secondaryGlow: '#6366F1',
    textClassName: 'text-cyan',
  },
  {
    id: 'violet',
    label: 'Нейро',
    caption: 'Violet',
    glow: '#A78BFA',
    secondaryGlow: '#22D3EE',
    textClassName: 'text-violet-300',
  },
  {
    id: 'emerald',
    label: 'Баланс',
    caption: 'Emerald',
    glow: '#22C55E',
    secondaryGlow: '#22D3EE',
    textClassName: 'text-success',
  },
  {
    id: 'amber',
    label: 'Импульс',
    caption: 'Amber',
    glow: '#F59E0B',
    secondaryGlow: '#FDE68A',
    textClassName: 'text-warning',
  },
  {
    id: 'rose',
    label: 'Энергия',
    caption: 'Rose',
    glow: '#FB7185',
    secondaryGlow: '#A78BFA',
    textClassName: 'text-rose-300',
  },
  {
    id: 'ice',
    label: 'Спокойствие',
    caption: 'Ice',
    glow: '#BAE6FD',
    secondaryGlow: '#22D3EE',
    textClassName: 'text-sky-100',
  },
]

export const companionShellPresets: CompanionShellPreset[] = [
  {
    id: 'system',
    label: 'System Core',
    caption: 'Чистая системная оболочка',
    auraMultiplier: 1,
    ringMultiplier: 1,
    scanMultiplier: 1,
    pulseMultiplier: 1,
    nodeOffset: 0,
    borderClassName: 'border-white/10',
  },
  {
    id: 'deepSpace',
    label: 'Deep Space',
    caption: 'Глубокая оболочка с мягким свечением',
    auraMultiplier: 1.18,
    ringMultiplier: 0.82,
    scanMultiplier: 1.28,
    pulseMultiplier: 1.14,
    nodeOffset: -1,
    borderClassName: 'border-indigo-300/15',
  },
  {
    id: 'neonFocus',
    label: 'Neon Focus',
    caption: 'Плотный сигнал и яркие кольца',
    auraMultiplier: 1.08,
    ringMultiplier: 1.24,
    scanMultiplier: 0.82,
    pulseMultiplier: 0.9,
    nodeOffset: 1,
    borderClassName: 'border-cyan/20',
  },
  {
    id: 'calmSignal',
    label: 'Calm Signal',
    caption: 'Спокойная оболочка без лишнего шума',
    auraMultiplier: 0.78,
    ringMultiplier: 0.72,
    scanMultiplier: 1.55,
    pulseMultiplier: 1.24,
    nodeOffset: -1,
    borderClassName: 'border-sky-100/10',
  },
]

export const defaultCompanionCustomization: CompanionCustomization = {
  displayName: companionDisplayNameFallback,
  accent: 'cyan',
  shell: 'system',
}

export function sanitizeCompanionDisplayName(value: unknown) {
  const normalized =
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''

  if (!normalized) {
    return companionDisplayNameFallback
  }

  return Array.from(normalized).slice(0, companionDisplayNameMaxLength).join('')
}

export function getCompanionAccentPreset(value: unknown) {
  return (
    companionAccentPresets.find((preset) => preset.id === value) ??
    companionAccentPresets[0]!
  )
}

export function getCompanionShellPreset(value: unknown) {
  return (
    companionShellPresets.find((preset) => preset.id === value) ??
    companionShellPresets[0]!
  )
}

export function normalizeCompanionCustomization(value: unknown): CompanionCustomization {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const accent = getCompanionAccentPreset(record.accent).id
  const shell = getCompanionShellPreset(record.shell).id
  const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : undefined

  return {
    displayName: sanitizeCompanionDisplayName(record.displayName),
    accent,
    shell,
    updatedAt,
  }
}

export function buildCompanionCustomizationDraft(
  value: Partial<CompanionCustomization>,
): CompanionCustomization {
  return normalizeCompanionCustomization({
    displayName: value.displayName,
    accent: value.accent,
    shell: value.shell,
    updatedAt: value.updatedAt,
  })
}
