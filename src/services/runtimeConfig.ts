function normalizeEnvFlag(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

export function isAuthEnabled() {
  return ['1', 'true', 'yes', 'enabled'].includes(normalizeEnvFlag(import.meta.env.VITE_AUTH_ENABLED))
}

export function getAuthDisabledMessage() {
  return 'Аккаунты пока выключены в этой сборке. LifeQuest работает локально на этом устройстве.'
}
