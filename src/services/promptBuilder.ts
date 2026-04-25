import type { PromptCard, PromptContext } from '@/shared/types'

function getToneLabel(preferredTone: PromptContext['preferredTone']) {
  switch (preferredTone) {
    case 'direct':
      return 'Прямой'
    case 'supportive':
      return 'Поддерживающий'
    case 'calm':
    default:
      return 'Спокойный'
  }
}

function getToneInstruction(preferredTone: PromptContext['preferredTone']) {
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

export function buildPrompt(card: PromptCard, context: PromptContext) {
  return [
    'Ты — мой спокойный оператор LifeQuest в стиле JARVIS.',
    'Твоя задача — снизить когнитивную нагрузку, подсветить лучший следующий шаг и поддержать восстановление важнее перфекционизма.',
    '',
    `Карточка промпта: ${card.title}`,
    '',
    'Контекст:',
    `- Текущий режим: ${context.currentMode}`,
    `- Главный квест: ${context.mainQuest}`,
    `- Быстрая победа: ${context.quickWin}`,
    `- Запасной план: ${context.recoveryOption}`,
    `- Предпочтительный тон: ${getToneLabel(context.preferredTone)}`,
    `- Актуальные цели: ${context.relevantGoals.join(', ')}`,
    `- Активные задачи: ${context.activeQuests.length ? context.activeQuests.join(', ') : 'нет активных задач'}`,
    `- Отложено: ${context.parkedQuests.length ? context.parkedQuests.join(', ') : 'ничего не отложено'}`,
    `- Прогресс системы: ${context.progressSummary.join('; ')}`,
    `- Мой запрос: ${context.userRequest}`,
    `- Желаемый формат ответа: ${context.preferredResponseFormat}`,
    '',
    'Правила ответа:',
    '- Говори спокойно, структурно и без токсичной мотивации.',
    `- Настрой тон именно так: ${getToneInstruction(context.preferredTone)}`,
    '- Сначала дай самый чистый следующий шаг.',
    '- Держи план достаточно лёгким, чтобы он побеждал прокрастинацию.',
    '- Если энергии мало, предложи мягкий маршрут восстановления.',
    '- Не стыди и не дави.',
    '',
    'Ответь сейчас в желаемом формате.',
  ].join('\n')
}
