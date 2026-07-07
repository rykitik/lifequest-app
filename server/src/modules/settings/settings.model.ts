import mongoose, { type Model } from 'mongoose'

import type { SettingsProfile } from './settings.types.js'

const { model, models, Schema } = mongoose

const settingsProfileSchema = new Schema<SettingsProfile>(
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
      maxlength: 80,
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
      required: true,
      default: 1,
      min: 1,
    },
    deviceId: {
      type: String,
      trim: true,
      maxlength: 120,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

export const SettingsProfileModel =
  (models.SettingsProfile as Model<SettingsProfile> | undefined) ??
  model<SettingsProfile>('SettingsProfile', settingsProfileSchema)
