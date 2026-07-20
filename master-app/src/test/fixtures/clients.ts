import type { Client } from '@/types'

import { CLIENT_ID, MASTER_CLIENT_ID } from './auth'

export function createMasterClient(overrides: Partial<Client> = {}): Client {
  return {
    id: MASTER_CLIENT_ID,
    clientId: CLIENT_ID,
    name: 'Ирина Клиентова',
    phone: '+79990000002',
    photo: null,
    isMaxUser: true,
    ...overrides,
  }
}
