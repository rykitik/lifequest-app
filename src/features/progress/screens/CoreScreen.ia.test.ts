import { describe, expect, it } from 'vitest'
import coreScreenSource from './CoreScreen.tsx?raw'

function indexOfRequired(value: string) {
  const index = coreScreenSource.indexOf(value)

  expect(index).toBeGreaterThan(-1)

  return index
}

describe('CoreScreen information architecture', () => {
  it('keeps the main system sections in the intended order', () => {
    const heroIndex = indexOfRequired('variant="hero"')
    const routeIndex = indexOfRequired('Сегодняшний маршрут')
    const skillTreeIndex = indexOfRequired('<SkillTreePanel')
    const weeklyIndex = indexOfRequired('<WeeklyRecapPanel')
    const milestonesIndex = indexOfRequired('<MilestonesPanel')
    const evolutionIndex = indexOfRequired('<CompanionEvolutionPreview')
    const customizationIndex = indexOfRequired('<CompanionCustomizationPanel')

    expect(heroIndex).toBeLessThan(routeIndex)
    expect(routeIndex).toBeLessThan(skillTreeIndex)
    expect(skillTreeIndex).toBeLessThan(weeklyIndex)
    expect(weeklyIndex).toBeLessThan(milestonesIndex)
    expect(milestonesIndex).toBeLessThan(evolutionIndex)
    expect(evolutionIndex).toBeLessThan(customizationIndex)
  })

  it('keeps mobile spacing and secondary companion controls compact', () => {
    expect(coreScreenSource).toContain('<section className="pb-24">')
    expect(coreScreenSource).toContain('showNodes={false}')
    expect(coreScreenSource).toContain('expanded={companionCustomizationOpen}')
    expect(coreScreenSource).toContain('setCompanionCustomizationOpen(true)')
    expect(coreScreenSource).not.toContain('grid-cols-[9rem_1fr]')
    expect(coreScreenSource.toLowerCase()).not.toMatch(/провал|плохая неделя|слабая дисциплина|серия потер|верни серию|streak/)
  })
})
