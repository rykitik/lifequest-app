import type { CompanionState } from '@/shared/types'

export interface CompanionEvolutionNode {
  state: CompanionState
  label: string
  cardLabel: string
  caption: string
  signal: string
  glow: string
  secondaryGlow: string
  unlockLevel: number
}

export interface CompanionEvolutionViewNode extends CompanionEvolutionNode {
  current: boolean
  unlocked: boolean
  future: boolean
  statusLabel: string
}

export interface CompanionEvolutionModel {
  currentLabel: string
  currentSignal: string
  nextLabel: string
  progressToNextForm: number
  nodes: CompanionEvolutionViewNode[]
}

const fallbackEvolutionNode: CompanionEvolutionNode = {
  state: 'idle',
  label: 'Спокоен',
  cardLabel: 'Спокоен',
  caption: 'База стабильна',
  signal: 'Ровный сигнал',
  glow: '#22D3EE',
  secondaryGlow: '#6366F1',
  unlockLevel: 1,
}

export const companionEvolutionNodes: CompanionEvolutionNode[] = [
  fallbackEvolutionNode,
  {
    state: 'focused',
    label: 'Сфокусирован',
    cardLabel: 'Фокус',
    caption: 'Сигнал собран',
    signal: 'Сигнал собран',
    glow: '#22D3EE',
    secondaryGlow: '#60A5FA',
    unlockLevel: 2,
  },
  {
    state: 'low_energy',
    label: 'Мало энергии',
    cardLabel: 'Бережность',
    caption: 'Режим экономии',
    signal: 'База сохранена',
    glow: '#F59E0B',
    secondaryGlow: '#FDE68A',
    unlockLevel: 3,
  },
  {
    state: 'overloaded',
    label: 'Перегружен',
    cardLabel: 'Разгрузка',
    caption: 'Сужение маршрута',
    signal: 'Лишнее снято',
    glow: '#EF4444',
    secondaryGlow: '#E879F9',
    unlockLevel: 4,
  },
  {
    state: 'recovering',
    label: 'Восстанавливается',
    cardLabel: 'Восстановление',
    caption: 'Возврат в систему',
    signal: 'Контур восстановлен',
    glow: '#22C55E',
    secondaryGlow: '#22D3EE',
    unlockLevel: 5,
  },
  {
    state: 'evolving',
    label: 'Эволюционирует',
    cardLabel: 'Эволюция',
    caption: 'Новая форма Core',
    signal: 'Рост активен',
    glow: '#A78BFA',
    secondaryGlow: '#22D3EE',
    unlockLevel: 7,
  },
]

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round(value)))
}

export function getCompanionEvolutionNode(state: CompanionState) {
  return (
    companionEvolutionNodes.find((node) => node.state === state) ?? fallbackEvolutionNode
  )
}

export function getCompanionMoodLabel(state: CompanionState) {
  return getCompanionEvolutionNode(state).label
}

export function buildCompanionEvolutionModel({
  mood,
  evolutionLevel,
  progressToNextForm,
}: {
  mood: CompanionState
  evolutionLevel: number
  progressToNextForm: number
}): CompanionEvolutionModel {
  const currentNode = getCompanionEvolutionNode(mood)
  const normalizedLevel = Math.max(1, Math.floor(evolutionLevel))
  const nodes = companionEvolutionNodes.map((node) => {
    const current = node.state === mood
    const unlocked = node.unlockLevel <= normalizedLevel || current
    const future = !unlocked

    return {
      ...node,
      current,
      unlocked,
      future,
      statusLabel: current ? 'Сейчас' : future ? 'Будущая форма' : 'Открыто',
    }
  })

  const nextNode =
    companionEvolutionNodes.find((node) => node.unlockLevel > normalizedLevel) ??
    companionEvolutionNodes[companionEvolutionNodes.length - 1] ??
    currentNode

  return {
    currentLabel: currentNode.label,
    currentSignal: currentNode.signal,
    nextLabel: nextNode.label,
    progressToNextForm: clampPercent(progressToNextForm),
    nodes,
  }
}

export function shouldAnimateEvolutionNode({
  reducedMotion,
  future,
}: {
  reducedMotion: boolean
  future: boolean
}) {
  return !reducedMotion && !future
}
