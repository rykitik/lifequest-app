const LIFEQUEST_DEVICE_ID_STORAGE_KEY = 'lifequest-device-id'

function createDeviceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getOrCreateDeviceId() {
  const existingDeviceId = window.localStorage.getItem(LIFEQUEST_DEVICE_ID_STORAGE_KEY)

  if (existingDeviceId) {
    return existingDeviceId
  }

  const nextDeviceId = createDeviceId()
  window.localStorage.setItem(LIFEQUEST_DEVICE_ID_STORAGE_KEY, nextDeviceId)

  return nextDeviceId
}

export function resetDeviceId() {
  window.localStorage.removeItem(LIFEQUEST_DEVICE_ID_STORAGE_KEY)
}

export { LIFEQUEST_DEVICE_ID_STORAGE_KEY }
