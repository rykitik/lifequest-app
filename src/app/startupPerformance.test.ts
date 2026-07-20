import { describe, expect, it } from 'vitest'
import providers from '@/app/providers.tsx?raw'
import onboardingScreen from '@/features/onboarding/screens/OnboardingScreen.tsx?raw'
import appShell from '@/shared/components/AppShell.tsx?raw'
import main from '../main.tsx?raw'

describe('startup performance guards', () => {
  it('keeps auth and sync stores out of the synchronous provider path', () => {
    expect(providers).toContain('scheduleAfterFirstPaint')
    expect(providers).not.toContain("from '@/stores/useAuthStore'")
    expect(providers).not.toContain("from '@/stores/useSyncStore'")
    expect(providers).toContain("import('@/stores/useAuthStore')")
    expect(providers).toContain("import('@/stores/useSyncStore')")
  })

  it('keeps overlays and bottom navigation out of the AppShell startup imports', () => {
    expect(appShell).toContain("import('@/shared/components/BottomNav')")
    expect(appShell).toContain("import('@/shared/components/AppOverlays')")
    expect(appShell).not.toContain("from '@/shared/components/BottomNav'")
    expect(appShell).not.toContain("from '@/stores/usePromptCenterStore'")
    expect(appShell).not.toContain("from '@/stores/useRescueStore'")
    expect(appShell).not.toContain("from '@/stores/useFeedbackStore'")
  })

  it('keeps Prompt Center store out of the static onboarding screen path', () => {
    expect(onboardingScreen).not.toContain("from '@/stores/usePromptCenterStore'")
    expect(onboardingScreen).toContain("import('@/stores/usePromptCenterStore')")
  })

  it('does not run production cache clearing from the main startup bundle', () => {
    expect(main).not.toContain("from '@/services/lifequestRuntime'")
    expect(main).not.toContain('await clearLifeQuestCaches()')
    expect(main).toContain("register('/sw.js'")
  })
})
