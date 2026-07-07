import { requestProtected } from '@/services/apiClient'
import type { AccountSettingsProfile, PreferredTone } from '@/shared/types'

interface SettingsProfileResponse {
  profile: AccountSettingsProfile
}

interface UpdateSettingsProfileInput {
  userName: string
  userRole: string
  preferredTone: PreferredTone
  deviceId?: string | null
}

export function getSettingsProfile() {
  return requestProtected<SettingsProfileResponse>(
    {
      url: '/settings/profile',
      method: 'GET',
    },
    {
      requestMeta: {
        endpoint: '/settings/profile',
        method: 'GET',
      },
    },
  )
}

export function updateSettingsProfile(input: UpdateSettingsProfileInput) {
  return requestProtected<SettingsProfileResponse>(
    {
      url: '/settings/profile',
      method: 'PUT',
      data: input,
    },
    {
      requestMeta: {
        endpoint: '/settings/profile',
        method: 'PUT',
      },
    },
  )
}
