import type {
  BodyDailyLog,
  BodySnapshot,
  CompanionState,
  DailyProgressSummary,
  MoneyAction,
  MoneySnapshot,
  ProgressProfile,
  PromptCard,
  QuestItem,
  QuestStep,
  RescueProblem,
  RescueSuggestion,
  TodayModeOption,
  TodayRoute,
  UserProfile,
} from '@/shared/types'
import { getLocalDateKey } from '@/shared/lib/date'

export const cloneData = <T,>(value: T): T => structuredClone(value)

export const mockUser: UserProfile = {
  id: 'user-captain',
  name: 'Капитан',
  title: 'Оператор жизненной системы',
  mainGoal: 'Двигаться спокойно и стабильно, не выгорая по пути.',
  relevantGoals: ['Беречь фокус-блоки', 'Снижать избегание денег', 'Держать базу тела в норме'],
  timezone: 'Europe/Moscow',
}

export const mockModes: TodayModeOption[] = [
  {
    key: 'low',
    label: 'Мало энергии',
    description: 'Сохрани базу и выбери самый маленький полезный шаг.',
    energyHint: 'Начать восстановление',
    companionState: 'low_energy',
    accent: '#F59E0B',
  },
  {
    key: 'stable',
    label: 'Стабильно',
    description: 'Выбери один чистый маршрут и держи спокойный темп.',
    energyHint: 'Ровный режим',
    companionState: 'idle',
    accent: '#22D3EE',
  },
  {
    key: 'high',
    label: 'В ресурсе',
    description: 'Используй доступную энергию для самого важного шага.',
    energyHint: 'Хороший фокус',
    companionState: 'focused',
    accent: '#6366F1',
  },
  {
    key: 'drifted',
    label: 'Дрейф',
    description: 'Сократи шум, вернись в систему и уменьшай требования к старту.',
    energyHint: 'Нужен возврат',
    companionState: 'overloaded',
    accent: '#EF4444',
  },
]

const mainQuest: QuestItem = {
  id: 'quest-main-1',
  title: 'Закончить каркас предложения',
  subtitle: 'Один осмысленный блок до вечера.',
  minutes: 55,
  xp: 45,
  sector: 'focus',
  progress: 65,
  status: 'active',
  classification: 'focus',
}

const quickWin: QuestItem = {
  id: 'quest-quick-1',
  title: 'Ответить на одно важное сообщение',
  subtitle: 'Коротко, ясно, закрыто.',
  minutes: 8,
  xp: 18,
  sector: 'stability',
  progress: 0,
  status: 'ready',
  classification: 'quick_win',
}

const recoveryQuest: QuestItem = {
  id: 'quest-recovery-1',
  title: 'Держать 2-минутный сброс под рукой',
  subtitle: 'Дыхание, вода, потом возвращение.',
  minutes: 2,
  xp: 15,
  sector: 'energy',
  progress: 0,
  status: 'ready',
  classification: 'stability',
}

export const mockTodayRoute: TodayRoute = {
  mainQuest,
  quickWin,
  recoveryQuest,
}

export const mockQuestInbox: QuestItem[] = [
  {
    id: 'quest-inbox-1',
    title: 'Собрать чеки и записать расходы',
    subtitle: 'Остановить маленький цикл финансового избегания.',
    minutes: 12,
    xp: 14,
    sector: 'money',
    progress: 0,
    status: 'ready',
  },
  {
    id: 'quest-inbox-2',
    title: 'Записаться на повторный визит к стоматологу',
    subtitle: 'Небольшая админ-задача, большое облегчение.',
    minutes: 5,
    xp: 12,
    sector: 'stability',
    progress: 0,
    status: 'ready',
  },
  {
    id: 'quest-inbox-3',
    title: 'Подготовить одежду для тренировки на завтра',
    subtitle: 'Сделать телесный маршрут легче ещё до старта.',
    minutes: 4,
    xp: 10,
    sector: 'body',
    progress: 0,
    status: 'ready',
  },
]

export const mockQuestActive: QuestItem[] = [
  cloneData(mainQuest),
  cloneData(quickWin),
  {
    id: 'quest-active-2',
    title: 'Проверить бюджет недели',
    subtitle: 'Спокойный денежный чек-ин, а не тревожный аудит.',
    minutes: 15,
    xp: 20,
    sector: 'money',
    progress: 30,
    status: 'active',
    classification: 'money',
  },
]

export const mockQuestParked: QuestItem[] = [
  {
    id: 'quest-parked-1',
    title: 'Обновить портфолио-сайт',
    subtitle: 'Оставить в парке, пока не закрыта основная работа.',
    minutes: 45,
    xp: 22,
    sector: 'focus',
    progress: 0,
    status: 'parked',
    classification: 'later',
  },
]

export const mockProgressProfile: ProgressProfile = {
  level: 7,
  totalXp: 2450,
  currentLevelXp: 2450,
  nextLevelXp: 3000,
  actionXp: 1520,
  consistencyXp: 470,
  recoveryXp: 460,
  achievements: ['2 чистых возврата', '7 дней спокойного ритма', 'Срыв денежного цикла'],
  sectors: [
    { key: 'focus', label: 'Фокус', level: 4, percent: 68, xp: 680, color: '#6366F1' },
    { key: 'body', label: 'Тело', level: 3, percent: 55, xp: 550, color: '#22C55E' },
    { key: 'money', label: 'Деньги', level: 2, percent: 41, xp: 410, color: '#F59E0B' },
    { key: 'stability', label: 'Стабильность', level: 4, percent: 74, xp: 740, color: '#A78BFA' },
    { key: 'energy', label: 'Энергия', level: 3, percent: 60, xp: 600, color: '#22D3EE' },
  ],
  dailySummary: createEmptyDailyProgressSummary(),
}

export const mockBodySnapshot: BodySnapshot = {
  date: getLocalDateKey(),
  weightKg: 82.3,
  weightTrendKg: -0.4,
  waterLiters: 1.7,
  steps: 7240,
  workout: 'Мобильность и разгрузка',
  workoutDone: false,
  foodDiscipline: 82,
  nutritionStatus: 'Нормально',
  movementType: 'Без тренировки',
  quickAction: 'Добавь воды перед следующим переключением задачи.',
}

export const mockBodyHistory = [83.0, 82.9, 82.8, 82.7, 82.9, 82.6, 82.5, 82.3]

export const mockBodyDailyLogs: BodyDailyLog[] = []

export const mockMoneySnapshot: MoneySnapshot = {
  balance: 3240,
  weeklyDelta: 180,
  debt: 9400,
  debtGoal: 15000,
  calmNote: 'Контроль лучше избегания. На сегодня достаточно одного маленького денежного действия.',
  history: [2900, 3000, 2980, 3110, 3075, 3190, 3240],
}

export const mockMoneyActions: MoneyAction[] = [
  { id: 'money-1', label: 'Проверить баланс счёта', minutes: 3, completed: true, rewardXp: 10 },
  { id: 'money-2', label: 'Записать вчерашние траты', minutes: 7, completed: false, rewardXp: 15 },
  { id: 'money-3', label: 'Запланировать платёж по долгу', minutes: 10, completed: false, rewardXp: 18 },
]

export const mockRescueProblems: RescueProblem[] = [
  {
    id: 'cant-start',
    label: 'Не могу начать',
    description: 'Задача ощущается слишком большой или слишком тяжёлой эмоционально.',
    suggestion: 'Уменьши задачу до такого масштаба, чтобы она почти казалась смешно маленькой.',
    supportNote: 'Нужен не весь результат, а только первый вход.',
    rewardXp: 15,
    sector: 'focus',
  },
  {
    id: 'doomscrolling',
    label: 'Залип в телефоне',
    description: 'Внимание утекает в дешёвые циклы и не возвращается обратно.',
    suggestion: 'Закрой один таб и положи телефон экраном вниз на две минуты.',
    supportNote: 'Сначала прерви цикл. Мотивация может прийти уже после.',
    rewardXp: 14,
    sector: 'stability',
  },
  {
    id: 'anxiety',
    label: 'Тревога / стресс',
    description: 'Система шумит, и сейчас ей нужно меньше давления, а не больше.',
    suggestion: 'Назови следующий безопасный маленький шаг и сделай только его.',
    supportNote: 'Ясность начинается с более узкой рамки.',
    rewardXp: 16,
    sector: 'stability',
  },
  {
    id: 'tired',
    label: 'Устал',
    description: 'Энергии мало, значит и маршрут должен стать легче.',
    suggestion: 'Вода, выпрямиться, потом двухминутная версия задачи.',
    supportNote: 'Сначала защити базу, потом проси результат.',
    rewardXp: 13,
    sector: 'energy',
  },
  {
    id: 'escape',
    label: 'Хочу сбежать',
    description: 'Давление выросло, и избегание кажется самым простым выходом.',
    suggestion: 'Выбери одну задачу до пяти минут, которая уменьшит чувство вины потом.',
    supportNote: 'Маленький шаг облегчения может сломать спираль ухода.',
    rewardXp: 15,
    sector: 'stability',
  },
  {
    id: 'binge',
    label: 'Хочу сорваться',
    description: 'Системе сейчас хочется быстрого облегчения.',
    suggestion: 'Сделай паузу на чай или воду и отложи срыв на десять минут.',
    supportNote: 'Даже отсрочка уже считается победой. Восстановление не требует идеала.',
    rewardXp: 17,
    sector: 'body',
  },
]

export const mockPromptCards: PromptCard[] = [
  {
    id: 'plan-day',
    title: 'Помоги распланировать день',
    description: 'Используй мой текущий режим и маршрут, чтобы собрать самый чистый план.',
    promptHint: 'Собери лёгкий маршрут на сегодня с одним главным квестом и одним запасным вариантом.',
    preferredFormat: 'Короткий маршрут с первым шагом и запасным вариантом',
  },
  {
    id: 'return-system',
    title: 'Я залип, верни меня в систему',
    description: 'Помоги вернуться, когда избегание уже выигрывает.',
    promptHint: 'Помоги мягко вернуться в систему после прокрастинации без стыда и давления.',
    preferredFormat: 'Спокойный план возврата с одним немедленным действием',
  },
  {
    id: 'anxious',
    title: 'Мне тревожно, помоги мыслить ясно',
    description: 'Снизь шум и сузь ситуацию до следующего полезного шага.',
    promptHint: 'Помоги снизить тревогу и превратить ситуацию в управляемый план.',
    preferredFormat: 'Опора, перспектива и следующий шаг',
  },
  {
    id: 'money',
    title: 'Деньги / финансы',
    description: 'Разложи финансовый стресс на более спокойный список действий.',
    promptHint: 'Помоги посмотреть на деньги спокойно и выбрать следующий разумный шаг.',
    preferredFormat: 'Простые денежные приоритеты и маленькие действия',
  },
  {
    id: 'weekly-review',
    title: 'Недельный разбор',
    description: 'Найти закономерности по телу, деньгам, фокусу и восстановлению за последние 7 дней.',
    promptHint:
      'Разбери последние 7 дней: тело, похудение, деньги, фокус, восстановление и один главный риск следующей недели.',
    preferredFormat: 'Короткий недельный обзор по телу, деньгам, закономерностям и одному реалистичному следующему шагу',
  },
  {
    id: 'relationships',
    title: 'Отношения / одиночество',
    description: 'Разобрать эмоциональную нагрузку и найти самый поддерживающий шаг.',
    promptHint: 'Помоги распаковать напряжение в отношениях без спирали и самокритики.',
    preferredFormat: 'Тёплое размышление с одним конкретным действием или границей',
  },
  {
    id: 'unpack-life',
    title: 'Разобрать мою жизнь',
    description: 'Взять широкий хаос и превратить его в понятную структуру.',
    promptHint: 'Помоги понять, что сейчас происходит, и выстроить маршрут через этот хаос.',
    preferredFormat: 'Темы, приоритеты и первый стабилизирующий маршрут',
  },
]

export const companionMessages: Record<CompanionState, string> = {
  idle: 'Система стабильна. Выбери один полезный маршрут и держи поверхность спокойной.',
  focused: 'Сигнал чистый. Защити самый важный шаг, пока энергия на месте.',
  low_energy: 'Сначала база. Уменьшаем запрос, пока старт не станет безопасным.',
  overloaded: 'Слишком многое открыто. Сузь шум и вернись в одну линию.',
  recovering: 'Восстановление — это тоже прогресс. Система возвращается к себе.',
  evolving: 'База усиливается. Малые победы складываются в новую силу.',
}

export function createQuestSteps(title: string): QuestStep[] {
  return [
    { id: `${title}-1`, label: `Открой рабочую поверхность для задачи «${title}»`, minutes: 5, done: false },
    { id: `${title}-2`, label: 'Сделай самый маленький осмысленный черновик или выбор', minutes: 12, done: false },
    { id: `${title}-3`, label: 'Оставь один маркер следующего шага на потом', minutes: 4, done: false },
  ]
}

export function buildRescueSuggestion(problem: RescueProblem): RescueSuggestion {
  return {
    title: problem.suggestion,
    steps: ['Сделай один спокойный вдох и снизь спешку.', 'Выполни самую маленькую версию действия прямо сейчас.', 'Остановись после первого ясного выигрыша.'],
    rewardXp: problem.rewardXp,
    sector: problem.sector,
    supportNote: problem.supportNote,
  }
}

export function getMockTodayRoute() {
  return cloneData(mockTodayRoute)
}

export function getMockQuestInbox() {
  return cloneData(mockQuestInbox)
}

export function getMockQuestActive() {
  return cloneData(mockQuestActive)
}

export function getMockQuestParked() {
  return cloneData(mockQuestParked)
}

export function getMockProgressProfile() {
  const profile = cloneData(mockProgressProfile)
  profile.dailySummary = createEmptyDailyProgressSummary()

  return profile
}

export function getMockBodySnapshot() {
  return cloneData(mockBodySnapshot)
}

export function getMockBodyHistory() {
  return cloneData(mockBodyHistory)
}

export function getMockBodyDailyLogs() {
  return cloneData(mockBodyDailyLogs)
}

export function getMockMoneySnapshot() {
  return cloneData(mockMoneySnapshot)
}

export function getMockMoneyActions() {
  return cloneData(mockMoneyActions)
}

export function getMockPromptCards() {
  return cloneData(mockPromptCards)
}

export function createEmptyDailyProgressSummary(date = getLocalDateKey()): DailyProgressSummary {
  return {
    date,
    xpToday: 0,
    completedTasks: 0,
    sectorXp: {
      focus: 0,
      body: 0,
      money: 0,
      stability: 0,
      energy: 0,
    },
  }
}
