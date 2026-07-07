import type { HydratedDocument, Types } from 'mongoose'

export type SettingsPreferredTone = 'calm' | 'direct' | 'supportive'

export interface SettingsProfile {
  userId: Types.ObjectId
  userName?: string
  userRole?: string
  preferredTone: SettingsPreferredTone
  syncVersion: number
  deviceId?: string
  createdAt: Date
  updatedAt: Date
}

export type SettingsProfileDocument = HydratedDocument<SettingsProfile>

export interface PublicSettingsProfile {
  userId: string
  userName: string
  userRole: string
  preferredTone: SettingsPreferredTone
  syncVersion: number
  updatedAt: string
}
