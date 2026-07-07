import type { SettingsProfileDocument, PublicSettingsProfile } from './settings.types.js'

export function toPublicSettingsProfile(document: SettingsProfileDocument): PublicSettingsProfile {
  return {
    userId: document.userId.toString(),
    userName: document.userName ?? '',
    userRole: document.userRole ?? '',
    preferredTone: document.preferredTone,
    syncVersion: document.syncVersion,
    updatedAt: document.updatedAt.toISOString(),
  }
}
