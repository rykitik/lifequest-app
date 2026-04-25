import { Outlet } from 'react-router-dom'
import { PromptCenterSheet } from '@/features/prompt-center/components/PromptCenterSheet'
import { RescueModal } from '@/features/rescue/components/RescueModal'
import { BottomNav } from '@/shared/components/BottomNav'

export function AppShell() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-shell-grid opacity-90" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-56 w-56 rounded-full bg-cyan/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-[30rem] flex-col px-4 safe-top">
        <main className="relative z-10 flex-1 pb-32">
          <Outlet />
        </main>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-1/2 z-30 w-full max-w-[30rem] -translate-x-1/2 px-4 safe-bottom">
        <div className="pointer-events-auto">
          <BottomNav />
        </div>
      </div>

      <RescueModal />
      <PromptCenterSheet />
    </div>
  )
}
