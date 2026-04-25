import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import { clearLifeQuestCaches, unregisterServiceWorkers } from '@/services/lifequestRuntime'
import '@/styles/globals.css'

if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (import.meta.env.DEV) {
      void unregisterServiceWorkers().then(() => clearLifeQuestCaches())
      return
    }

    let hasReloadedForNewWorker = false

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasReloadedForNewWorker) {
        return
      }

      hasReloadedForNewWorker = true
      window.location.reload()
    })

    void navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then(async (registration) => {
        await clearLifeQuestCaches()
        await registration.update()
      })
  })
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
