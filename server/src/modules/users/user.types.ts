import type { HydratedDocument } from 'mongoose'

export type UserRole = 'user' | 'admin'

export interface User {
  email: string
  passwordHash: string
  name?: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export type UserDocument = HydratedDocument<User>

export interface PublicUser {
  id: string
  email: string
  name?: string
  role: UserRole
  createdAt: string
  updatedAt: string
}
