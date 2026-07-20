import type { Service as ClientService } from '@client/types'
import type { Service as MasterService } from '@/types'

import { SERVICE_ID } from './auth'

export function createMasterService(overrides: Partial<MasterService> = {}): MasterService {
  return {
    id: SERVICE_ID,
    name: 'Стрижка',
    description: 'Тестовая услуга',
    duration: 60,
    price: 250_000,
    discountPercent: null,
    sessionsCount: 1,
    photo: null,
    isActive: true,
    workPhotos: [],
    ...overrides,
  }
}

export function createClientService(overrides: Partial<ClientService> = {}): ClientService {
  const service = createMasterService()
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    duration: service.duration,
    price: service.price,
    discountPercent: service.discountPercent,
    sessionsCount: service.sessionsCount,
    photo: service.photo,
    workPhotos: service.workPhotos,
    ...overrides,
  }
}
