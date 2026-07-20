import type { DestinationSelectorContextData } from '@/standalone-pages/handoff/destination-selector/types'

export const DESTINATION_TOKEN = 'destination-fixture-token'

export function createDestinationContext(
  overrides: Partial<DestinationSelectorContextData> = {},
): DestinationSelectorContextData {
  return {
    clientName: 'Ирина Клиентова',
    clientPhone: '+79990000002',
    serviceName: 'Стрижка',
    date: '2026-07-21',
    time: '10:00',
    clientAddress: null,
    expiresAt: '2026-07-19T10:00:00.000Z',
    draftVersion: 1,
    ...overrides,
  }
}
