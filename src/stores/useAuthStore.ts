import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cloneData, mockUser } from '@/services/mockData'
import type { UserProfile } from '@/shared/types'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isBootstrapped: boolean
  bootstrap: () => void
  login: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isBootstrapped: false,
      bootstrap: () => {
        if (get().isBootstrapped && get().isAuthenticated && get().user) {
          return
        }

        set({
          user: cloneData(mockUser),
          isAuthenticated: true,
          isBootstrapped: true,
        })
      },
      login: () =>
        set({
          user: cloneData(mockUser),
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'lifequest-auth',
      version: 2,
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isBootstrapped: state.isBootstrapped,
      }),
    },
  ),
)
