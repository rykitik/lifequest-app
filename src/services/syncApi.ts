import { requestProtected } from '@/services/apiClient'
import type { SyncBootstrapResponse } from '@/shared/types'

export function bootstrapSync() {
  return requestProtected<SyncBootstrapResponse>(
    {
      url: '/sync/bootstrap',
      method: 'GET',
    },
    {
      requestMeta: {
        endpoint: '/sync/bootstrap',
        method: 'GET',
      },
    },
  )
}
