import { describe, expect, it, vi } from 'vitest'

class MemoryStorage implements Storage {
  private items = new Map<string, string>()

  get length() {
    return this.items.size
  }

  clear() {
    this.items.clear()
  }

  getItem(key: string) {
    return this.items.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.items.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.items.delete(key)
  }

  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}

function installStorage() {
  vi.stubGlobal('localStorage', new MemoryStorage())
}

async function importMilestones() {
  vi.resetModules()
  installStorage()

  const service = await import('@/services/milestones')
  const store = await import('@/stores/useMilestonesStore')
  const feedback = await import('@/stores/useFeedbackStore')
  const companion = await import('@/stores/useCompanionStore')

  return { companion, feedback, service, store }
}

describe('useMilestonesStore', () => {
  it('unlocks milestone once and persists safe local data', async () => {
    const { service, store } = await importMilestones()

    expect(service.unlockLifeQuestMilestone('body_first_signal', '2026-07-20T10:00:00.000Z')).toBe(true)
    expect(service.unlockLifeQuestMilestone('body_first_signal', '2026-07-20T10:01:00.000Z')).toBe(false)

    expect(store.useMilestonesStore.getState().milestones).toHaveLength(1)
    expect(store.useMilestonesStore.getState().milestones[0]).toMatchObject({
      id: 'body_first_signal',
      type: 'body_first_signal',
      title: 'Первый сигнал тела',
      domain: 'body',
    })
    expect(localStorage.getItem('lifequest-milestones')).toContain('body_first_signal')
  })

  it('shows milestone feedback only on first unlock', async () => {
    const { companion, feedback, service } = await importMilestones()

    expect(service.unlockLifeQuestMilestone('backup_created')).toBe(true)
    const firstToastId = feedback.useFeedbackStore.getState().rewardToast?.id
    const firstReactionId = companion.useCompanionStore.getState().reaction?.id

    expect(feedback.useFeedbackStore.getState().rewardToast).toMatchObject({
      type: 'system',
      message: 'Веха открыта · Первая резервная копия создана',
      signal: 'Веха зафиксирована.',
    })
    expect(service.unlockLifeQuestMilestone('backup_created')).toBe(false)
    expect(feedback.useFeedbackStore.getState().rewardToast?.id).toBe(firstToastId)
    expect(companion.useCompanionStore.getState().reaction?.id).toBe(firstReactionId)
  })

  it('does not store private money details in milestone definitions', async () => {
    const { service } = await importMilestones()
    const text = JSON.stringify(service.milestoneDefinitions).toLowerCase()

    expect(text).not.toContain('1234')
    expect(text).not.toContain('rawdescription')
    expect(text).not.toContain('amount')
    expect(text).not.toContain('операция:')
    expect(text).not.toContain('расход')
  })

  it('copy avoids shame, fear, streak and pressure language', async () => {
    const { service } = await importMilestones()
    const text = JSON.stringify(service.milestoneDefinitions).toLowerCase()

    expect(text).not.toMatch(/серия потер|провал|стыд|штраф|наказ|виноват|обязан|лидерборд|streak/)
  })

  it('is local-first and does not call API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { service } = await importMilestones()

    service.unlockLifeQuestMilestone('core_customized')

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('reset clears milestones', async () => {
    const { service, store } = await importMilestones()

    service.unlockLifeQuestMilestone('daily_quest_completed')
    expect(store.useMilestonesStore.getState().milestones).toHaveLength(1)

    store.useMilestonesStore.getState().resetDemoData()
    expect(store.useMilestonesStore.getState().milestones).toEqual([])
  })
})
