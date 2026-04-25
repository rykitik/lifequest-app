import {
  getQuestEffort,
  getQuestImpact,
  isMainQuestCandidate,
  isQuickQuest,
  isRecoveryQuest,
  isTinyQuest,
} from '@/services/questMeta'
import type { ModeKey, QuestItem, TodayRoute, TodayRouteKey } from '@/shared/types'

function isAvailableQuest(quest: QuestItem) {
  return quest.status !== 'complete'
}

function getBaseScore(quest: QuestItem) {
  let score = 0

  if (quest.status === 'active') {
    score += 4
  }

  if (quest.status === 'parked' || quest.classification === 'later') {
    score -= 3
  }

  if (getQuestImpact(quest) === 'high') {
    score += 5
  } else if (getQuestImpact(quest) === 'medium') {
    score += 2
  }

  if (getQuestEffort(quest) === 'tiny') {
    score += 3
  } else if (getQuestEffort(quest) === 'heavy') {
    score -= 2
  }

  return score
}

function scoreMainQuest(quest: QuestItem, mode: ModeKey) {
  let score = getBaseScore(quest)

  if (isMainQuestCandidate(quest)) {
    score += 12
  }

  if (quest.classification === 'focus') {
    score += 10
  }

  if (mode === 'low') {
    if (isTinyQuest(quest) || isQuickQuest(quest) || isRecoveryQuest(quest)) {
      score += 10
    }

    if (getQuestEffort(quest) === 'heavy') {
      score -= 18
    }
  }

  if (mode === 'stable') {
    if (getQuestImpact(quest) === 'high') {
      score += 10
    }

    if (getQuestEffort(quest) === 'heavy') {
      score -= 4
    }
  }

  if (mode === 'high') {
    if (getQuestImpact(quest) === 'high') {
      score += 12
    }

    if (getQuestEffort(quest) === 'heavy') {
      score += 5
    }
  }

  if (mode === 'drifted') {
    if (isTinyQuest(quest) || isQuickQuest(quest)) {
      score += 14
    }

    if (isRecoveryQuest(quest)) {
      score += 6
    }

    if (getQuestEffort(quest) === 'heavy') {
      score -= 20
    }
  }

  return score
}

function scoreQuickWin(quest: QuestItem, mode: ModeKey) {
  let score = getBaseScore(quest)

  if (isQuickQuest(quest)) {
    score += 14
  }

  if (isTinyQuest(quest)) {
    score += 10
  }

  if (mode === 'low' || mode === 'drifted') {
    if (isRecoveryQuest(quest)) {
      score += 4
    }

    if (getQuestEffort(quest) === 'heavy') {
      score -= 18
    }
  }

  return score
}

function scoreRecoveryQuest(quest: QuestItem, mode: ModeKey) {
  let score = getBaseScore(quest)

  if (isRecoveryQuest(quest)) {
    score += 16
  }

  if (isTinyQuest(quest)) {
    score += 10
  }

  if (quest.sector === 'stability' || quest.sector === 'energy') {
    score += 8
  }

  if (mode === 'drifted' && isQuickQuest(quest)) {
    score += 4
  }

  if (getQuestEffort(quest) === 'heavy') {
    score -= 20
  }

  return score
}

function getPrimaryFilter(slot: TodayRouteKey) {
  if (slot === 'mainQuest') {
    return (quest: QuestItem) => isMainQuestCandidate(quest)
  }

  if (slot === 'quickWin') {
    return (quest: QuestItem) => isQuickQuest(quest) || isTinyQuest(quest)
  }

  return (quest: QuestItem) => isRecoveryQuest(quest) || isTinyQuest(quest)
}

function getSlotScore(slot: TodayRouteKey, quest: QuestItem, mode: ModeKey) {
  if (slot === 'mainQuest') {
    return scoreMainQuest(quest, mode)
  }

  if (slot === 'quickWin') {
    return scoreQuickWin(quest, mode)
  }

  return scoreRecoveryQuest(quest, mode)
}

function sortCandidates(slot: TodayRouteKey, mode: ModeKey, quests: QuestItem[]) {
  return [...quests].sort((left, right) => {
    const scoreDifference = getSlotScore(slot, right, mode) - getSlotScore(slot, left, mode)

    if (scoreDifference !== 0) {
      return scoreDifference
    }

    const minutesDifference = left.minutes - right.minutes

    if (minutesDifference !== 0) {
      return minutesDifference
    }

    return right.xp - left.xp
  })
}

export function getRouteCandidatesForSlot(
  quests: QuestItem[],
  slot: TodayRouteKey,
  currentMode: ModeKey,
  excludedQuestIds: string[] = [],
) {
  const excluded = new Set(excludedQuestIds)
  const available = quests.filter((quest) => isAvailableQuest(quest) && !excluded.has(quest.id))
  const primaryFiltered = available.filter(getPrimaryFilter(slot))
  const source = primaryFiltered.length ? primaryFiltered : available

  return sortCandidates(slot, currentMode, source)
}

export function generateRouteFromQuests(quests: QuestItem[], currentMode: ModeKey): TodayRoute {
  const route: TodayRoute = {
    mainQuest: null,
    quickWin: null,
    recoveryQuest: null,
  }
  const usedIds = new Set<string>()

  const pickQuest = (slot: TodayRouteKey) => {
    const nextQuest =
      getRouteCandidatesForSlot(quests, slot, currentMode, Array.from(usedIds))[0] ?? null

    if (!nextQuest) {
      return null
    }

    usedIds.add(nextQuest.id)
    return nextQuest
  }

  route.mainQuest = pickQuest('mainQuest')
  route.quickWin = pickQuest('quickWin')
  route.recoveryQuest = pickQuest('recoveryQuest')

  return route
}
