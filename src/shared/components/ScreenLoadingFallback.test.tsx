import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ScreenLoadingFallback } from '@/shared/components/ScreenLoadingFallback'

describe('ScreenLoadingFallback', () => {
  it('uses calm startup copy and respects reduced motion', () => {
    const markup = renderToStaticMarkup(<ScreenLoadingFallback />)

    expect(markup).toContain('LifeQuest')
    expect(markup).toContain('Запускаю локальную систему')
    expect(markup).toContain('Собираю базу')
    expect(markup).toContain('Companion Core активируется')
    expect(markup).toContain('motion-reduce:animate-none')
    expect(markup).not.toMatch(/ошибка|тревог|страх|стыд|провал|сбой/i)
  })
})
