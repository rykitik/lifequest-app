import mongoose, { type Model } from 'mongoose'

import type { SettingsProfileRecord } from './settings.types.js'

const { model, models, Schema } = mongoose

const settingsProfileSchema = new Schema<SettingsProfileRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    userName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    userRole: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    preferredTone: {
      type: String,
      enum: ['calm', 'direct', 'supportive'],
      default: 'calm',
      required: true,
    },
    syncVersion: {
      type: Number,
      default: 1,
      required: true,
      min: 1,
    },
    deviceId: {
      type: String,
      trim: true,
      maxlength: 160,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

settingsProfileSchema.pre('save', function normalizeSettingsProfile(next) {
  if (typeof this.userName === 'string') {
    this.userName = this.userName.trim() || undefined
  }

  if (typeof this.userRole === 'string') {
    this.userRole = this.userRole.trim() || undefined
  }

  if (typeof this.deviceId === 'string') {
    this.deviceId = this.deviceId.trim() || undefined
  }

  next()
})

export const SettingsProfileModel =
  (models.SettingsProfile as Model<SettingsProfileRecord> | undefined) ??
  model<SettingsProfileRecord>('SettingsProfile', settingsProfileSchema)
