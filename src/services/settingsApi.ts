import { requestProtected } from '@/services/apiClient'
import type { AccountSettingsProfile, PreferredTone } from '@/shared/types'

export interface SettingsProfileResponse {
  profile: AccountSettingsProfile
}

export interface UpdateSettingsProfileInput {
  userName?: string
  userRole?: string
  preferredTone?: PreferredTone
  deviceId?: string | null
}

export async function getSettingsProfile() {
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

export async function updateSettingsProfile(input: UpdateSettingsProfileInput) {
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
