import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cloneData, mockUser } from '@/services/mockData'
import { mergePersistedState } from '@/shared/lib/persist'
import type { AuthMode, UserProfile } from '@/shared/types'

interface AuthDraftCredentials {
  email?: string
  password?: string
  name?: string
}

interface AuthActionResult {
  success: boolean
  mode: AuthMode
  message: string
}

interface AuthState {
  mode: AuthMode
  user: UserProfile | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  bootstrap: () => Promise<void>
  switchToLocalMode: () => void
  login: (credentials?: AuthDraftCredentials) => Promise<AuthActionResult>
  register: (credentials?: AuthDraftCredentials) => Promise<AuthActionResult>
  logout: () => Promise<AuthActionResult>
  resetDemoData: () => void
}

type AuthPersistedState = Pick<AuthState, 'mode' | 'user' | 'isAuthenticated'>

function createLocalUser() {
  return cloneData(mockUser)
}

function createAuthPersistedState(): AuthPersistedState {
  return {
    mode: 'local',
    user: createLocalUser(),
    isAuthenticated: false,
  }
}

function createPlaceholderResult(mode: AuthMode): AuthActionResult {
  return {
    success: false,
    mode,
    message:
      'Аккаунты появятся позже. Сейчас LifeQuest продолжает работать локально на этом устройстве.',
  }
}

function migrateAuthPersistedState(persistedState: unknown): AuthPersistedState {
  const defaults = createAuthPersistedState()

  if (!persistedState || typeof persistedState !== 'object') {
    return defaults
  }

  const merged = mergePersistedState(defaults, persistedState) as Partial<AuthPersistedState>
  const nextMode = merged.mode === 'account' ? 'account' : 'local'
  const nextUser = merged.user ?? createLocalUser()

  return {
    mode: nextMode,
    user: nextUser,
    isAuthenticated:
      nextMode === 'account' ? Boolean(merged.isAuthenticated && nextUser?.userId) : false,
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...createAuthPersistedState(),
      isBootstrapping: false,
      bootstrap: async () => {
        if (get().isBootstrapping) {
          return
        }

        set((state) => (state.isBootstrapping ? state : { isBootstrapping: true }))

        set((state) => {
          const nextMode = state.mode === 'account' ? 'account' : 'local'
          const nextUser = state.user ?? createLocalUser()
          const nextIsAuthenticated =
            nextMode === 'account' ? Boolean(state.isAuthenticated && nextUser.userId) : false

          if (
            state.mode === nextMode &&
            state.user === nextUser &&
            state.isAuthenticated === nextIsAuthenticated &&
            !state.isBootstrapping
          ) {
            return state
          }

          return {
            mode: nextMode,
            user: nextUser,
            isAuthenticated: nextIsAuthenticated,
            isBootstrapping: false,
          }
        })
      },
      switchToLocalMode: () =>
        set((state) => {
          if (
            state.mode === 'local' &&
            !state.isAuthenticated &&
            state.user !== null &&
            !state.user.userId &&
            !state.isBootstrapping
          ) {
            return state
          }

          const nextUser =
            state.user === null
              ? createLocalUser()
              : {
                  ...state.user,
                  userId: undefined,
                }

          return {
            mode: 'local',
            user: nextUser,
            isAuthenticated: false,
            isBootstrapping: false,
          }
        }),
      login: async () => createPlaceholderResult(get().mode),
      register: async () => createPlaceholderResult(get().mode),
      logout: async () => {
        get().switchToLocalMode()

        return {
          success: true,
          mode: 'local',
          message:
            'LifeQuest вернулся в локальный режим. До появления аккаунтов данные хранятся только на этом устройстве.',
        }
      },
      resetDemoData: () =>
        set(() => ({
          ...createAuthPersistedState(),
          isBootstrapping: false,
        })),
    }),
    {
      name: 'lifequest-auth',
      version: 3,
      migrate: migrateAuthPersistedState,
      partialize: (state) => ({
        mode: state.mode,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
