import { type PropsWithChildren, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'

export function AppProviders({ children }: PropsWithChildren) {
  const bootstrap = useAuthStore((state) => state.bootstrap)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return <>{children}</>
}
