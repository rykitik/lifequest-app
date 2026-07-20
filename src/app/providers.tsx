import { type PropsWithChildren, useEffect } from 'react'
import { scheduleAfterFirstPaint } from '@/shared/lib/startup'

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    let cleanup: (() => void) | undefined
    let isCancelled = false

    const cancelStartup = scheduleAfterFirstPaint(() => {
      void (async () => {
        const [{ useAuthStore }, { useSettingsStore }, { useSyncStore }] = await Promise.all([
          import('@/stores/useAuthStore'),
          import('@/stores/useSettingsStore'),
          import('@/stores/useSyncStore'),
        ])

        if (isCancelled) {
          return
        }

        const applyLocalFirstRuntimeState = () => {
          const syncStore = useSyncStore.getState()
          const settingsStore = useSettingsStore.getState()
          const authState = useAuthStore.getState()

          if (authState.mode === 'account' && authState.isAuthenticated) {
            syncStore.prepareAccountSyncReadiness()
          } else {
            syncStore.bootstrapLocalSync()
            settingsStore.resetAccountSyncState()
          }
        }

        await useAuthStore.getState().bootstrap()

        if (isCancelled) {
          return
        }

        applyLocalFirstRuntimeState()

        const unsubscribeAuth = useAuthStore.subscribe((state, previousState) => {
          if (
            state.isBootstrapping ||
            (state.mode === previousState.mode &&
              state.isAuthenticated === previousState.isAuthenticated)
          ) {
            return
          }

          window.setTimeout(applyLocalFirstRuntimeState, 0)
        })

        const handleNetworkStatusChange = () => {
          useSyncStore.getState().setNetworkOnline(window.navigator.onLine)
        }

        handleNetworkStatusChange()
        window.addEventListener('online', handleNetworkStatusChange)
        window.addEventListener('offline', handleNetworkStatusChange)

        cleanup = () => {
          unsubscribeAuth()
          window.removeEventListener('online', handleNetworkStatusChange)
          window.removeEventListener('offline', handleNetworkStatusChange)
        }
      })()
    })

    return () => {
      isCancelled = true
      cancelStartup()
      cleanup?.()
    }
  }, [])

  return <>{children}</>
}
