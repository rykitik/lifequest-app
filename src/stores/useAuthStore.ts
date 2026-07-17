import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as authApi from '@/services/authApi'
import { clearApiAccessToken, setApiAccessToken } from '@/services/apiClient'
import { normalizeApiError } from '@/services/httpClientContract'
import { getAuthDisabledMessage, isAuthEnabled } from '@/services/runtimeConfig'
import { mergePersistedState } from '@/shared/lib/persist'
import type {
  AuthMode,
  AuthResponse,
  AuthStatus,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from '@/shared/types'

interface AuthActionResult {
  success: boolean
  message: string
}

interface AuthState {
  mode: AuthMode
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
  lastError: string | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  bootstrap: () => Promise<void>
  switchToLocalMode: () => void
  clearAuthError: () => void
  login: (credentials: LoginRequest) => Promise<AuthActionResult>
  register: (credentials: RegisterRequest) => Promise<AuthActionResult>
  logout: () => Promise<AuthActionResult>
  resetDemoData: () => void
}

type AuthPersistedState = Pick<AuthState, 'mode' | 'user'>

function createAuthPersistedState(): AuthPersistedState {
  return {
    mode: 'local',
    user: null,
  }
}

function createAuthRuntimeState() {
  return {
    status: 'local' as AuthStatus,
    accessToken: null as string | null,
    lastError: null as string | null,
    isAuthenticated: false,
    isBootstrapping: false,
  }
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<AuthUser>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.userId === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.name === 'string'
  )
}

function migrateAuthPersistedState(persistedState: unknown): AuthPersistedState {
  const defaults = createAuthPersistedState()

  if (!persistedState || typeof persistedState !== 'object') {
    return defaults
  }

  const merged = mergePersistedState(defaults, persistedState) as Partial<AuthPersistedState>
  const nextMode = merged.mode === 'account' ? 'account' : 'local'
  const nextUser = isAuthUser(merged.user) ? merged.user : null

  return {
    mode: nextMode,
    user: nextMode === 'account' ? nextUser : null,
  }
}

function buildAuthenticatedState(authResponse: Pick<AuthResponse, 'user' | 'session' | 'tokens'>) {
  return {
    mode: 'account' as const,
    status: authResponse.session.status,
    user: authResponse.user,
    accessToken: authResponse.tokens.accessToken,
    lastError: null,
    isAuthenticated: true,
    isBootstrapping: false,
  }
}

function buildLocalModeState() {
  return {
    mode: 'local' as const,
    status: 'local' as const,
    user: null,
    accessToken: null,
    lastError: null,
    isAuthenticated: false,
    isBootstrapping: false,
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...createAuthPersistedState(),
      ...createAuthRuntimeState(),
      bootstrap: async () => {
        if (!isAuthEnabled()) {
          clearApiAccessToken()
          set(() => ({
            ...buildLocalModeState(),
          }))
          return
        }

        if (get().isBootstrapping) {
          return
        }

        set((state) => {
          if (state.isBootstrapping) {
            return state
          }

          return {
            ...state,
            isBootstrapping: true,
            status: 'refreshing',
            lastError: null,
          }
        })

        try {
          const refreshResponse = await authApi.refresh()
          setApiAccessToken(refreshResponse.tokens.accessToken)

          const meResponse = await authApi.me(refreshResponse.tokens.accessToken)

          set(() => ({
            ...buildAuthenticatedState({
              user: meResponse.user,
              session: refreshResponse.session,
              tokens: refreshResponse.tokens,
            }),
          }))
        } catch {
          clearApiAccessToken()
          set((state) => {
            const nextState = buildLocalModeState()

            if (
              state.mode === nextState.mode &&
              state.status === nextState.status &&
              state.user === nextState.user &&
              state.accessToken === nextState.accessToken &&
              state.lastError === nextState.lastError &&
              state.isAuthenticated === nextState.isAuthenticated &&
              state.isBootstrapping === nextState.isBootstrapping
            ) {
              return state
            }

            return nextState
          })
        }
      },
      switchToLocalMode: () => {
        clearApiAccessToken()

        set((state) => {
          const nextState = buildLocalModeState()

          if (
            state.mode === nextState.mode &&
            state.status === nextState.status &&
            state.user === nextState.user &&
            state.accessToken === nextState.accessToken &&
            state.lastError === nextState.lastError &&
            state.isAuthenticated === nextState.isAuthenticated &&
            state.isBootstrapping === nextState.isBootstrapping
          ) {
            return state
          }

          return nextState
        })
      },
      clearAuthError: () =>
        set((state) => {
          if (!state.lastError && state.status !== 'error') {
            return state
          }

          return {
            ...state,
            lastError: null,
            status: state.isAuthenticated ? 'authenticated' : state.mode === 'account' ? 'unauthenticated' : 'local',
          }
        }),
      login: async (credentials) => {
        if (!isAuthEnabled()) {
          clearApiAccessToken()
          set(() => ({
            ...buildLocalModeState(),
          }))

          return {
            success: false,
            message: getAuthDisabledMessage(),
          }
        }

        const previousState = get()

        set((state) => ({
          ...state,
          status: 'authenticating',
          lastError: null,
        }))

        try {
          const response = await authApi.login(credentials)
          setApiAccessToken(response.tokens.accessToken)

          set(() => ({
            ...buildAuthenticatedState(response),
          }))

          return {
            success: true,
            message: 'Вход выполнен. Аккаунт подключён к этому устройству.',
          }
        } catch (error) {
          const normalizedError = normalizeApiError(error)

          set((state) => {
            if (previousState.isAuthenticated && previousState.user && previousState.accessToken) {
              return {
                ...state,
                mode: previousState.mode,
                status: 'authenticated',
                user: previousState.user,
                accessToken: previousState.accessToken,
                isAuthenticated: true,
                lastError: normalizedError.message,
              }
            }

            clearApiAccessToken()

            return {
              ...buildLocalModeState(),
              status: 'error',
              lastError: normalizedError.message,
            }
          })

          return {
            success: false,
            message: normalizedError.message,
          }
        }
      },
      register: async (credentials) => {
        if (!isAuthEnabled()) {
          clearApiAccessToken()
          set(() => ({
            ...buildLocalModeState(),
          }))

          return {
            success: false,
            message: getAuthDisabledMessage(),
          }
        }

        const previousState = get()

        set((state) => ({
          ...state,
          status: 'authenticating',
          lastError: null,
        }))

        try {
          const response = await authApi.register(credentials)
          setApiAccessToken(response.tokens.accessToken)

          set(() => ({
            ...buildAuthenticatedState(response),
          }))

          return {
            success: true,
            message: 'Аккаунт создан. Можно продолжать день без сброса локальных данных.',
          }
        } catch (error) {
          const normalizedError = normalizeApiError(error)

          set((state) => {
            if (previousState.isAuthenticated && previousState.user && previousState.accessToken) {
              return {
                ...state,
                mode: previousState.mode,
                status: 'authenticated',
                user: previousState.user,
                accessToken: previousState.accessToken,
                isAuthenticated: true,
                lastError: normalizedError.message,
              }
            }

            clearApiAccessToken()

            return {
              ...buildLocalModeState(),
              status: 'error',
              lastError: normalizedError.message,
            }
          })

          return {
            success: false,
            message: normalizedError.message,
          }
        }
      },
      logout: async () => {
        if (!isAuthEnabled()) {
          clearApiAccessToken()
          set(() => ({
            ...buildLocalModeState(),
          }))

          return {
            success: true,
            message: 'Локальный режим активен. Данные на устройстве сохранены.',
          }
        }

        set((state) => ({
          ...state,
          status: 'logging_out',
          lastError: null,
        }))

        try {
          await authApi.logout()
        } catch {
          // Даже если backend logout не ответил, локальный UX должен безопасно вернуться в local mode.
        }

        clearApiAccessToken()
        set(() => ({
          ...buildLocalModeState(),
        }))

        return {
          success: true,
          message: 'Аккаунт отключён. Локальные данные на устройстве сохранены.',
        }
      },
      resetDemoData: () => {
        clearApiAccessToken()
        set(() => ({
          ...createAuthPersistedState(),
          ...createAuthRuntimeState(),
        }))
      },
    }),
    {
      name: 'lifequest-auth',
      version: 4,
      migrate: migrateAuthPersistedState,
      partialize: (state) => ({
        mode: state.mode,
        user: state.user,
      }),
    },
  ),
)
