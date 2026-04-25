import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import '@/styles/globals.css'

async function clearLifeQuestCaches() {
  if (!('caches' in window)) {
    return
  }

  const keys = await window.caches.keys()

  await Promise.all(
    keys.filter((key) => key.startsWith('lifequest-')).map((key) => window.caches.delete(key)),
  )
}

async function unregisterServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations()

  await Promise.all(registrations.map((registration) => registration.unregister()))
}

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
