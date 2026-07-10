import { useBodyStore } from '@/stores/useBodyStore'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useMoneyStore } from '@/stores/useMoneyStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useRescueStore } from '@/stores/useRescueStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTodayStore } from '@/stores/useTodayStore'
import type { BodyDailyLog, QuestItem, TodayRoute } from '@/shared/types'

const QUEST_LIMIT = 5
const DAILY_LOG_LIMIT = 7

function compactQuest(quest: QuestItem | null) {
  if (!quest) {
    return null
  }

  return {
    id: quest.id,
    title: quest.title,
    subtitle: quest.subtitle,
    minutes: quest.minutes,
    xp: quest.xp,
    sector: quest.sector,
    progress: quest.progress,
    status: quest.status,
    classification: quest.classification,
    steps: quest.steps?.slice(0, 3).map((step) => ({
      label: step.label,
      minutes: step.minutes,
      done: step.done,
    })),
  }
}

function compactQuestList(quests: QuestItem[], limit = QUEST_LIMIT) {
  return quests.slice(0, limit).map(compactQuest)
}

function compactRoute(route: TodayRoute) {
  return {
    mainQuest: compactQuest(route.mainQuest),
    quickWin: compactQuest(route.quickWin),
    recoveryQuest: compactQuest(route.recoveryQuest),
  }
}

function sortLogsByDateDesc(logs: BodyDailyLog[]) {
  return [...logs].sort((left, right) => right.date.localeCompare(left.date))
}

export function buildDailyContext() {
  const today = useTodayStore.getState()
  const quests = useQuestStore.getState()
  const mode = today.modes.find((item) => item.key === today.currentMode)

  return {
    mode: {
      key: today.currentMode,
      label: mode?.label ?? today.currentMode,
      description: mode?.description ?? '',
      energyHint: mode?.energyHint ?? '',
    },
    route: compactRoute(today.route),
    quests: {
      active: compactQuestList(quests.active.filter((quest) => quest.status !== 'complete')),
      inbox: compactQuestList(quests.inbox),
      parked: compactQuestList(quests.parked, 3),
    },
  }
}

export function buildBodyContext() {
  const body = useBodyStore.getState()

  return {
    today: body.today,
    lastSevenDailyLogs: sortLogsByDateDesc(body.dailyLogs).slice(0, DAILY_LOG_LIMIT),
    weightHistory: body.history.slice(-10),
  }
}

export function buildMoneyContext() {
  const money = useMoneyStore.getState()

  return {
    snapshot: money.snapshot,
    dailyMoneyActions: money.dailyMoneyQuests.slice(0, 6).map((action) => ({
      id: action.id,
      label: action.label,
      minutes: action.minutes,
      completed: action.completed,
      rewardXp: action.rewardXp,
    })),
  }
}

export function buildRescueContext() {
  const rescue = useRescueStore.getState()

  return {
    currentProblem: rescue.currentProblem
      ? {
          id: rescue.currentProblem.id,
          label: rescue.currentProblem.label,
          description: rescue.currentProblem.description,
        }
      : null,
    lastSuggestion: rescue.suggestion,
    accepted: rescue.accepted,
    completed: rescue.completed,
  }
}

export function buildWeeklyReviewContext() {
  const progress = useProgressStore.getState()

  return {
    level: progress.level,
    totalXp: progress.totalXp,
    dailySummary: progress.dailySummary,
    sectors: progress.sectors.map((sector) => ({
      key: sector.key,
      label: sector.label,
      level: sector.level,
      percent: sector.percent,
      xp: sector.xp,
    })),
    xp: {
      actionXp: progress.actionXp,
      consistencyXp: progress.consistencyXp,
      recoveryXp: progress.recoveryXp,
    },
    achievements: progress.achievements.slice(0, 5),
  }
}

export function buildFullLifeQuestContext() {
  const companion = useCompanionStore.getState()
  const settings = useSettingsStore.getState()

  return {
    settings: {
      userName: settings.userName,
      userRole: settings.userRole,
      preferredTone: settings.preferredTone,
    },
    today: buildDailyContext(),
    progress: buildWeeklyReviewContext(),
    body: buildBodyContext(),
    money: buildMoneyContext(),
    rescue: buildRescueContext(),
    companion: {
      mood: companion.mood,
      activeMessage: companion.activeMessage,
      evolutionLevel: companion.evolutionLevel,
      stabilityScore: companion.stabilityScore,
    },
  }
}
