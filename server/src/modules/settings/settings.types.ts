import type { HydratedDocument, Types } from 'mongoose'

export type PreferredTone = 'calm' | 'direct' | 'supportive'

export interface SettingsProfileRecord {
  userId: Types.ObjectId
  userName?: string
  userRole?: string
  preferredTone: PreferredTone
  syncVersion: number
  deviceId?: string
  createdAt: Date
  updatedAt: Date
}

export type SettingsProfileDocument = HydratedDocument<SettingsProfileRecord>

export interface PublicSettingsProfile {
  userId: string
  userName: string
  userRole: string
  preferredTone: PreferredTone
  syncVersion: number
  updatedAt: string
}

export interface SettingsProfileResponse {
  profile: PublicSettingsProfile
}

export interface UpdateSettingsProfileInput {
  userName?: string
  userRole?: string
  preferredTone?: PreferredTone
  deviceId?: string
}
