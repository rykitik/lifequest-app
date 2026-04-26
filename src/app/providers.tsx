import { type PropsWithChildren, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSyncStore } from '@/stores/useSyncStore'
import type { AuthMode } from '@/shared/types'

export function AppProviders({ children }: PropsWithChildren) {
  const bootstrap = useAuthStore((state) => state.bootstrap)
  const authMode = useAuthStore((state) => state.mode)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping)
  const [hasCompletedBootstrap, setHasCompletedBootstrap] = useState(false)
  const previousAuthStateRef = useRef<{
    mode: AuthMode
    isAuthenticated: boolean
  } | null>(null)

  useEffect(() => {
    let isMounted = true

    void (async () => {
      await bootstrap()

      if (!isMounted) {
        return
      }

      const syncStore = useSyncStore.getState()
      const currentAuthState = useAuthStore.getState()

      syncStore.initializeDeviceId()

      if (currentAuthState.mode === 'account' && currentAuthState.isAuthenticated) {
        syncStore.prepareAccountSyncReadiness()
      } else {
        syncStore.bootstrapLocalSync()
      }

      previousAuthStateRef.current = {
        mode: currentAuthState.mode,
        isAuthenticated: currentAuthState.isAuthenticated,
      }
      setHasCompletedBootstrap(true)
    })()

    return () => {
      isMounted = false
    }
  }, [bootstrap])

  useEffect(() => {
    if (!hasCompletedBootstrap || isBootstrapping) {
      return
    }

    const syncStore = useSyncStore.getState()
    const previousAuthState = previousAuthStateRef.current

    syncStore.initializeDeviceId()

    if (authMode === 'account' && isAuthenticated) {
      syncStore.prepareAccountSyncReadiness()
    } else if (previousAuthState?.mode === 'account' || previousAuthState?.isAuthenticated) {
      syncStore.resetSyncState()
    } else {
      syncStore.bootstrapLocalSync()
    }

    previousAuthStateRef.current = {
      mode: authMode,
      isAuthenticated,
    }
  }, [authMode, hasCompletedBootstrap, isAuthenticated, isBootstrapping])

  useEffect(() => {
    if (!hasCompletedBootstrap || typeof window === 'undefined') {
      return
    }

    const handleNetworkStatusChange = () => {
      useSyncStore.getState().setNetworkOnline(window.navigator.onLine)
    }

    handleNetworkStatusChange()
    window.addEventListener('online', handleNetworkStatusChange)
    window.addEventListener('offline', handleNetworkStatusChange)

    return () => {
      window.removeEventListener('online', handleNetworkStatusChange)
      window.removeEventListener('offline', handleNetworkStatusChange)
    }
  }, [hasCompletedBootstrap])

  return <>{children}</>
}
