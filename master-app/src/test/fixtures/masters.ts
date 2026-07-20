import type { Master as ClientMaster } from '@client/types'
import type { Master as MasterProfile } from '@/types'

import { MASTER_ID } from './auth'
import { createClientSchedule, createMasterSchedule } from './schedule'
import { createClientService, createMasterService } from './services'

export function createMasterProfile(overrides: Partial<MasterProfile> = {}): MasterProfile {
  return {
    id: MASTER_ID,
    name: 'Анна Мастерова',
    photo: null,
    description: 'Тестовый профиль мастера',
    contacts: '@anna_test',
    phone: '+79990000001',
    location: 'Москва, Тестовая улица, 1',
    locationNote: 'Вход со двора',
    lat: 55.7558,
    lng: 37.6176,
    rating: 4.9,
    cardNumber: null,
    vkPayLinked: false,
    homeVisit: true,
    isOnboarded: true,
    schedule: createMasterSchedule(),
    services: [createMasterService()],
    ...overrides,
  }
}

export function createClientMaster(overrides: Partial<ClientMaster> = {}): ClientMaster {
  return {
    id: MASTER_ID,
    name: 'Анна Мастерова',
    photo: null,
    description: 'Тестовый профиль мастера',
    phone: '+79990000001',
    location: 'Москва, Тестовая улица, 1',
    lat: 55.7558,
    lng: 37.6176,
    rating: 4.9,
    homeVisit: true,
    maxProfileLink: 'https://max.ru/anna_test',
    timezone: 'Europe/Moscow',
    blocked: false,
    schedule: createClientSchedule(),
    services: [createClientService()],
    reviews: [],
    ...overrides,
  }
}
