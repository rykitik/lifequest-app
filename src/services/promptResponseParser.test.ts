import { describe, expect, it } from 'vitest'
import { parsePromptResponse } from '@/services/promptResponseParser'

function validPromptResponseJson() {
  return JSON.stringify({
    lifequest: {
      summary: 'Неделя была неровной, но управляемой.',
      todayMainQuest: 'Собрать один спокойный день.',
      quickWin: 'Выпить воды и пройти 5 минут.',
      recoveryAction: 'Сделать короткий вечерний сброс.',
      bodyFocus: 'Держать воду и движение.',
      moneyFocus: 'Проверить безопасный остаток.',
      risk: 'Усталость может раздуть план.',
      coreMessage: 'Система спокойна. Двигаемся одним шагом.',
      suggestedActions: [
        {
          title: 'Выпить 500 мл воды до обеда',
          domain: 'body',
          difficulty: 'easy',
          xp: 10,
        },
      ],
    },
  })
}

describe('parsePromptResponse', () => {
  it('разбирает валидный чистый JSON', () => {
    const rawJson = validPromptResponseJson()
    const result = parsePromptResponse(rawJson)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.rawJson).toBe(rawJson)
      expect(result.data.summary).toBe('Неделя была неровной, но управляемой.')
    }
  })

  it('разбирает JSON внутри markdown code block', () => {
    const result = parsePromptResponse(`Вот итог:\n\n\`\`\`json\n${validPromptResponseJson()}\n\`\`\``)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.quickWin).toBe('Выпить воды и пройти 5 минут.')
    }
  })

  it('предпочитает markdown code block с lifequest, если выше есть другой JSON', () => {
    const result = parsePromptResponse(
      `Пример:\n\`\`\`json\n{"demo":true}\n\`\`\`\nФинальный блок:\n\`\`\`json\n${validPromptResponseJson()}\n\`\`\``,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.summary).toBe('Неделя была неровной, но управляемой.')
    }
  })

  it('разбирает длинный обычный текст с JSON в конце', () => {
    const longIntro = 'Спокойный разбор недели без JSON. '.repeat(4_000)
    const result = parsePromptResponse(`${longIntro}\n${validPromptResponseJson()}`)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.moneyFocus).toBe('Проверить безопасный остаток.')
    }
  })

  it('игнорирует лишние фигурные скобки до JSON-блока lifequest', () => {
    const result = parsePromptResponse(
      `Черновик: {тело} {деньги} {"не lifequest": true}\n${validPromptResponseJson()}`,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.coreMessage).toBe('Система спокойна. Двигаемся одним шагом.')
    }
  })

  it('мягко отвечает ошибкой, если JSON не найден', () => {
    const result = parsePromptResponse('Обычный текст с примерами {без json} и без lifequest.')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('JSON-блок lifequest')
    }
  })

  it('мягко отвечает ошибкой на очень длинный текст без JSON', () => {
    const result = parsePromptResponse('x'.repeat(120_000))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('JSON-блок lifequest')
    }
  })

  it('ограничивает только слишком большой JSON-кандидат', () => {
    const result = parsePromptResponse(`\`\`\`json\n{"lifequest":"${'x'.repeat(100_001)}"}\n\`\`\``)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('JSON-блок слишком длинный')
    }
  })

  it('мягко отвечает ошибкой на битый JSON', () => {
    const result = parsePromptResponse('```json\n{"lifequest": {\n```')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('не удалось разобрать')
    }
  })

  it('не падает на unknown fields', () => {
    const result = parsePromptResponse(
      JSON.stringify({
        lifequest: {
          summary: 'Итог.',
          todayMainQuest: 'Квест.',
          quickWin: 'Победа.',
          recoveryAction: 'Восстановление.',
          bodyFocus: 'Тело.',
          moneyFocus: 'Деньги.',
          risk: 'Риск.',
          coreMessage: 'Сообщение.',
          suggestedActions: [],
          unknownField: 'лишнее поле',
        },
      }),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('неизвестные поля')
    }
  })
})
