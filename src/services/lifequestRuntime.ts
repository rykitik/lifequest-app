export const LIFEQUEST_DEMO_STORAGE_KEYS = [
  'lifequest-quests',
  'lifequest-today',
  'lifequest-progress',
  'lifequest-body',
  'lifequest-money',
  'lifequest-companion',
  'lifequest-prompt-center',
  'lifequest-settings',
] as const

export interface ClearLifeQuestRuntimeOptions {
  storageKeys?: readonly string[]
  clearAllLocalStorage?: boolean
  clearSessionStorage?: boolean
  clearCaches?: boolean
  unregisterServiceWorkers?: boolean
}

export interface PwaStatusSnapshot {
  isInstalled: boolean
  hasServiceWorkerSupport: boolean
  hasActiveServiceWorker: boolean
  hasWaitingServiceWorker: boolean
}

function getLifeQuestLocalStorageKeys() {
  return Object.keys(window.localStorage).filter((key) => key.startsWith('lifequest-'))
}

export function clearLifeQuestStorageKeys(keys: readonly string[] = LIFEQUEST_DEMO_STORAGE_KEYS) {
  keys.forEach((key) => window.localStorage.removeItem(key))
}

export function clearAllLifeQuestLocalStorage() {
  getLifeQuestLocalStorageKeys().forEach((key) => window.localStorage.removeItem(key))
}

export function clearLifeQuestSessionStorage() {
  window.sessionStorage.clear()
}

export async function clearLifeQuestCaches() {
  if (!('caches' in window)) {
    return
  }

  const keys = await window.caches.keys()

  await Promise.all(
    keys.filter((key) => key.startsWith('lifequest-')).map((key) => window.caches.delete(key)),
  )
}

export async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const registrations = await navigator.serviceWorker.getRegistrations()

  await Promise.all(registrations.map((registration) => registration.unregister()))
}

export async function clearLifeQuestRuntimeData(options: ClearLifeQuestRuntimeOptions = {}) {
  const {
    storageKeys = LIFEQUEST_DEMO_STORAGE_KEYS,
    clearAllLocalStorage = false,
    clearSessionStorage = false,
    clearCaches = false,
    unregisterServiceWorkers: shouldUnregisterServiceWorkers = false,
  } = options

  if (clearAllLocalStorage) {
    clearAllLifeQuestLocalStorage()
  } else {
    clearLifeQuestStorageKeys(storageKeys)
  }

  if (clearSessionStorage) {
    clearLifeQuestSessionStorage()
  }

  if (shouldUnregisterServiceWorkers) {
    await unregisterServiceWorkers()
  }

  if (clearCaches) {
    await clearLifeQuestCaches()
  }
}

export async function getPwaStatusSnapshot(): Promise<PwaStatusSnapshot> {
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true

  if (!('serviceWorker' in navigator)) {
    return {
      isInstalled,
      hasServiceWorkerSupport: false,
      hasActiveServiceWorker: false,
      hasWaitingServiceWorker: false,
    }
  }

  const registration = await navigator.serviceWorker.getRegistration()

  return {
    isInstalled,
    hasServiceWorkerSupport: true,
    hasActiveServiceWorker: Boolean(registration?.active),
    hasWaitingServiceWorker: Boolean(registration?.waiting),
  }
}

export async function checkForPwaUpdate() {
  if (!('serviceWorker' in navigator)) {
    return getPwaStatusSnapshot()
  }

  const registration = await navigator.serviceWorker.getRegistration()

  if (!registration) {
    return getPwaStatusSnapshot()
  }

  await registration.update()

  return getPwaStatusSnapshot()
}

export async function applyWaitingServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  const registration = await navigator.serviceWorker.getRegistration()

  if (!registration?.waiting) {
    return false
  }

  registration.waiting.postMessage({ type: 'SKIP_WAITING' })

  return true
}
