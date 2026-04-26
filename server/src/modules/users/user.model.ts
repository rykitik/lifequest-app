import mongoose, { type Model } from 'mongoose'

import type { User } from './user.types.js'

const { model, models, Schema } = mongoose

const userSchema = new Schema<User>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

userSchema.pre('save', function normalizeEmail(next) {
  if (this.email) {
    this.email = this.email.trim().toLowerCase()
  }

  next()
})

export const UserModel =
  (models.User as Model<User> | undefined) ?? model<User>('User', userSchema)
