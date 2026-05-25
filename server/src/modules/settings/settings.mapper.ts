import type { SettingsProfileDocument, PublicSettingsProfile } from './settings.types.js'

export function toPublicSettingsProfile(profile: SettingsProfileDocument): PublicSettingsProfile {
  return {
    userId: profile.userId.toString(),
    userName: profile.userName ?? '',
    userRole: profile.userRole ?? '',
    preferredTone: profile.preferredTone,
    syncVersion: profile.syncVersion,
    updatedAt: profile.updatedAt.toISOString(),
  }
}
