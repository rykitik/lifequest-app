import { describe, expect, it } from 'vitest'
import {
  buildCompanionEvolutionModel,
  companionEvolutionNodes,
  getCompanionMoodLabel,
  shouldAnimateEvolutionNode,
} from './evolution'

describe('companion evolution model', () => {
  it('highlights the current companion state', () => {
    const model = buildCompanionEvolutionModel({
      mood: 'focused',
      evolutionLevel: 2,
      progressToNextForm: 74,
    })

    const current = model.nodes.filter((node) => node.current)

    expect(current).toHaveLength(1)
    expect(current[0]?.label).toBe('Сфокусирован')
    expect(current[0]?.statusLabel).toBe('Сейчас')
  })

  it('renders long state names with compact card labels', () => {
    const recovering = companionEvolutionNodes.find((node) => node.state === 'recovering')
    const evolving = companionEvolutionNodes.find((node) => node.state === 'evolving')

    expect(recovering?.label).toBe('Восстанавливается')
    expect(recovering?.cardLabel).toBe('Восстановление')
    expect(evolving?.label).toBe('Эволюционирует')
    expect(evolving?.cardLabel).toBe('Эволюция')
  })

  it('renders locked states as future forms, not active actions', () => {
    const model = buildCompanionEvolutionModel({
      mood: 'idle',
      evolutionLevel: 1,
      progressToNextForm: 18,
    })

    const futureNodes = model.nodes.filter((node) => node.future)

    expect(futureNodes.length).toBeGreaterThan(0)
    expect(futureNodes.every((node) => !node.current)).toBe(true)
    expect(futureNodes.every((node) => node.statusLabel === 'Будущая форма')).toBe(true)
  })

  it('renders progress to the next form within percent bounds', () => {
    expect(
      buildCompanionEvolutionModel({
        mood: 'focused',
        evolutionLevel: 2,
        progressToNextForm: 148,
      }).progressToNextForm,
    ).toBe(100)
    expect(
      buildCompanionEvolutionModel({
        mood: 'focused',
        evolutionLevel: 2,
        progressToNextForm: -12,
      }).progressToNextForm,
    ).toBe(0)
  })

  it('keeps companion evolution copy free from shame mechanics', () => {
    const forbidden = ['провал', 'виноват', 'ленив', 'стыд', 'штраф', 'серия потеряна']
    const copy = companionEvolutionNodes
      .flatMap((node) => [node.label, node.cardLabel, node.caption, node.signal])
      .join(' ')
      .toLowerCase()

    for (const word of forbidden) {
      expect(copy).not.toContain(word)
    }
  })

  it('keeps full mood labels available for the current state header', () => {
    expect(getCompanionMoodLabel('recovering')).toBe('Восстанавливается')
    expect(getCompanionMoodLabel('evolving')).toBe('Эволюционирует')
  })

  it('respects reduced motion for evolution node animation', () => {
    expect(shouldAnimateEvolutionNode({ reducedMotion: true, future: false })).toBe(false)
    expect(shouldAnimateEvolutionNode({ reducedMotion: false, future: true })).toBe(false)
    expect(shouldAnimateEvolutionNode({ reducedMotion: false, future: false })).toBe(true)
  })
})
