import { buildFullLifeQuestContext, buildWeeklyReviewContext } from '@/services/contextBuilder'
import type { PreferredTone, PromptCard } from '@/shared/types'

export type PromptType =
  | 'daily_plan'
  | 'rescue'
  | 'body_weight_loss'
  | 'procrastination'
  | 'weekly_review'
  | 'money_review'
  | 'life_unpack'

interface PromptBuildOptions {
  userRequest: string
  preferredResponseFormat: string
}

function mapPromptType(card: PromptCard): PromptType {
  switch (card.id) {
    case 'plan-day':
      return 'daily_plan'
    case 'return-system':
      return 'procrastination'
    case 'anxious':
      return 'rescue'
    case 'money':
      return 'money_review'
    case 'weekly-review':
      return 'weekly_review'
    case 'relationships':
      return 'life_unpack'
    case 'unpack-life':
      return 'life_unpack'
    case 'body-weight-loss':
      return 'body_weight_loss'
    default:
      return 'life_unpack'
  }
}

function getToneInstruction(preferredTone: PreferredTone) {
  switch (preferredTone) {
    case 'direct':
      return 'Говори коротко, конкретно и по делу. Меньше успокоительных оборотов, больше ясных решений.'
    case 'supportive':
      return 'Дай больше валидации и поддержки, но без инфантилизации, стыда и токсичной мотивации.'
    case 'calm':
    default:
      return 'Держи мягкий, стабилизирующий тон. Снимай лишнее давление и поддерживай ясность.'
  }
}

function getTaskInstruction(promptType: PromptType) {
  switch (promptType) {
    case 'daily_plan':
      return [
        'Собери лёгкий маршрут на сегодня.',
        'Найди 1 главный квест, 1 быструю победу и 1 запасной план.',
        'Если текущий маршрут уже нормальный, не перестраивай всё, а уточни первый шаг.',
      ]
    case 'rescue':
      return [
        'Снизь шум и помоги вернуть управляемость.',
        'Дай короткую стабилизирующую рамку и одно действие на 2-5 минут.',
        'Не превращай ответ в терапевтический трактат.',
      ]
    case 'body_weight_loss':
      return [
        'Помоги выбрать спокойный фокус по телу для похудения и контроля базовых рычагов.',
        'Не считай калории и не делай фитнес-трекер.',
        'Опирайся на вес, воду, шаги, питание и движение.',
      ]
    case 'procrastination':
      return [
        'Помоги выйти из прокрастинации без стыда.',
        'Сузь задачу до минимального старта и дай понятный следующий шаг.',
        'Если энергии мало, предложи маршрут возврата вместо давления.',
      ]
    case 'weekly_review':
      return [
        'Сделай короткий недельный разбор LifeQuest за последние 7 дней.',
        'Кратко оцени неделю без стыда, давления и драматизации.',
        'Найди 2-3 закономерности по телу, деньгам, фокусу и восстановлению, если данных достаточно.',
        'Отдельно разбери тело/похудение: вес, воду, шаги, питание, движение и тренировки.',
        'Отдельно разбери деньги: расходы недели, доходы недели, безопасный остаток, долги и ближайшие обязательства.',
        'Отдельно разбери фокус/продуктивность и восстановление/энергию.',
        'Найди один главный риск следующей недели.',
        'Дай один главный шаг на следующую неделю.',
        'Дай одну быструю победу на завтра.',
        'Дай запасной план на плохой день.',
        'Если данных мало, честно скажи об этом и предложи улучшить сбор данных.',
      ]
    case 'money_review':
      return [
        'Разложи финансовое состояние спокойно и без катастрофизации.',
        'Выбери один денежный фокус и одно маленькое действие.',
        'Не придумывай цифры, которых нет в контексте.',
      ]
    case 'life_unpack':
    default:
      return [
        'Помоги распаковать текущий хаос жизни в понятную структуру.',
        'Найди главный риск, главный шаг и мягкий запасной маршрут.',
        'Не пытайся решить всю жизнь одним ответом.',
      ]
  }
}

function getJsonContract() {
  return `{
  "lifequest": {
    "summary": "Краткий вывод",
    "todayMainQuest": "Главный квест",
    "quickWin": "Быстрая победа",
    "recoveryAction": "Запасной план",
    "bodyFocus": "Фокус по телу",
    "moneyFocus": "Фокус по деньгам",
    "risk": "Главный риск",
    "coreMessage": "Сообщение от Ядра",
    "suggestedActions": [
      {
        "title": "Название действия",
        "domain": "today",
        "difficulty": "easy",
        "xp": 10
      }
    ]
  }
}`
}

function serializeContext(context: unknown) {
  return JSON.stringify(context, null, 2)
}

export function buildPrompt(card: PromptCard, options: PromptBuildOptions) {
  const promptType = mapPromptType(card)
  const fullContext = buildFullLifeQuestContext()
  const context = promptType === 'weekly_review' ? buildWeeklyReviewContext() : fullContext

  return [
    'Роль:',
    'Ты — спокойный LifeQuest Core Operator в стиле JARVIS.',
    'Твоя задача — снизить когнитивную нагрузку, помочь выбрать следующий шаг и поддержать возврат в систему без давления.',
    '',
    'Контекст:',
    serializeContext(context),
    '',
    'Карточка:',
    `- Тип: ${promptType}`,
    `- Название: ${card.title}`,
    `- Запрос пользователя: ${options.userRequest || 'Пользователь не добавил дополнительный запрос.'}`,
    `- Желаемый формат ответа: ${options.preferredResponseFormat}`,
    '',
    'Задача:',
    ...getTaskInstruction(promptType).map((line) => `- ${line}`),
    '',
    'Ограничения:',
    `- Тон: ${getToneInstruction(fullContext.settings.preferredTone)}`,
    '- Без стыда.',
    '- Без токсичной мотивации.',
    '- Не давать огромный план.',
    '- Дать 1 главный шаг.',
    '- Дать быструю победу.',
    '- Дать запасной план.',
    '- Если данных мало, не выдумывать факты.',
    '- Для недельного разбора не превращать ответ в отчёт с графиками или фитнес-трекер.',
    '- Рекомендации должны быть маленькими и реалистичными.',
    '- Лучше указать мягкую рекомендацию, чем уверенно додумывать.',
    '',
    'Формат ответа:',
    '- Сначала дай понятный короткий текст для пользователя.',
    '- В конце ответа добавь JSON-блок для импорта обратно в LifeQuest.',
    '- JSON должен быть строго валидным.',
    '- Не добавляй комментарии внутрь JSON.',
    '- Не используй markdown внутри JSON-значений.',
    '- Допустимые domain: today, plan, body, money, rescue, core.',
    '- Допустимые difficulty: easy, medium, hard.',
    '- Если какой-то фокус неприменим, оставь мягкую короткую рекомендацию.',
    '',
    'JSON-блок в конце ответа должен быть строго такого вида:',
    '```json',
    getJsonContract(),
    '```',
  ].join('\n')
}
