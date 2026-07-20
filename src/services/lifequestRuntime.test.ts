import { describe, expect, it } from 'vitest'
import { LIFEQUEST_DEMO_STORAGE_KEYS } from '@/services/lifequestRuntime'

describe('lifequest runtime storage keys', () => {
  it('includes milestones in reset/demo storage keys', () => {
    expect(LIFEQUEST_DEMO_STORAGE_KEYS).toContain('lifequest-milestones')
  })
})
