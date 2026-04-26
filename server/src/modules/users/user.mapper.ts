import type { PublicUser, UserDocument } from './user.types.js'

export function toPublicUser(user: Pick<UserDocument, 'id' | 'email' | 'name' | 'role' | 'createdAt' | 'updatedAt'>): PublicUser {
  return {
    id: user.id,
    email: user.email,
    ...(user.name ? { name: user.name } : {}),
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}
