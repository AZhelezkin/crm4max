import { describe, expect, it, vi } from 'vitest'

import { createClientService } from '@/test/fixtures/services'
import { MemoryStorage } from '@/test/storage'

async function loadStore() {
  vi.resetModules()
  return import('./booking.store')
}

describe.sequential('client booking store', () => {
  it('обновляет master, service и transient booking fields', async () => {
    const { useBookingStore } = await loadStore()
    const service = createClientService()
    const state = useBookingStore.getState()

    state.setMasterId('master-1')
    state.setMasterProfileLink('https://max.ru/master')
    state.setRescheduleId('booking-old')
    state.setService(service, 'Уход')
    state.setDateTime('2026-07-21', '10:00')
    state.setRemind(false)
    state.setClientAddress('Москва, Тестовая улица, 2')
    state.setOnlineMeetingLink('https://meet.example.com/room')
    state.setClientApartment('15')
    state.setClientFloor('7')
    state.setClientIntercom('123#')

    expect(useBookingStore.getState()).toMatchObject({
      masterId: 'master-1',
      masterProfileLink: 'https://max.ru/master',
      rescheduleId: null,
      service,
      categoryName: 'Уход',
      date: '2026-07-21',
      time: '10:00',
      remind: false,
      clientAddress: 'Москва, Тестовая улица, 2',
      onlineMeetingLink: 'https://meet.example.com/room',
      clientApartment: '15',
      clientFloor: '7',
      clientIntercom: '123#',
    })
  })

  it('заменяет indexed slot без мутации предыдущего массива', async () => {
    const { useBookingStore } = await loadStore()
    useBookingStore.getState().setSlots([
      { date: '2026-07-21', time: '10:00' },
      { date: '2026-07-28', time: '11:00' },
    ])
    const previousSlots = useBookingStore.getState().slots

    useBookingStore.getState().setSlot(1, '2026-07-29', '12:00')

    expect(useBookingStore.getState().slots).toEqual([
      { date: '2026-07-21', time: '10:00' },
      { date: '2026-07-29', time: '12:00' },
    ])
    expect(useBookingStore.getState().slots).not.toBe(previousSlots)
    expect(previousSlots[1]).toEqual({ date: '2026-07-28', time: '11:00' })

    useBookingStore.getState().clearSlots()
    expect(useBookingStore.getState().slots).toEqual([])
  })

  it('reset сохраняет master identity и очищает transient draft', async () => {
    const { useBookingStore } = await loadStore()
    useBookingStore.setState({
      masterId: 'master-1',
      masterProfileLink: 'https://max.ru/master',
      rescheduleId: 'booking-old',
      service: createClientService(),
      categoryName: 'Уход',
      date: '2026-07-21',
      time: '10:00',
      slots: [{ date: '2026-07-21', time: '10:00' }],
      remind: false,
      clientAddress: 'Адрес клиента',
      onlineMeetingLink: 'https://meet.example.com/room',
      clientApartment: '15',
      clientFloor: '7',
      clientIntercom: '123#',
    })

    useBookingStore.getState().reset()

    expect(useBookingStore.getState()).toMatchObject({
      masterId: 'master-1',
      masterProfileLink: 'https://max.ru/master',
      rescheduleId: null,
      service: null,
      categoryName: null,
      date: '',
      time: '',
      slots: [],
      remind: true,
      clientAddress: null,
      onlineMeetingLink: null,
      clientApartment: '',
      clientFloor: '',
      clientIntercom: '',
    })
  })

  it('пишет draft в session storage', async () => {
    const { useBookingStore } = await loadStore()

    useBookingStore.getState().setMasterId('master-persisted')
    useBookingStore.getState().setDateTime('2026-07-22', '13:30')

    const persisted = JSON.parse(sessionStorage.getItem('booking-draft') ?? '{}') as {
      state?: { masterId?: string; date?: string; time?: string }
    }
    expect(persisted.state).toMatchObject({
      masterId: 'master-persisted',
      date: '2026-07-22',
      time: '13:30',
    })
  })

  it('восстанавливает interrupted draft из session storage', async () => {
    sessionStorage.setItem('booking-draft', JSON.stringify({
      state: {
        masterId: 'master-restored',
        masterProfileLink: 'https://max.ru/restored',
        rescheduleId: 'booking-restored',
        service: createClientService(),
        categoryName: 'Уход',
        date: '2026-07-23',
        time: '15:00',
        slots: [],
        remind: false,
        clientAddress: 'Сохранённый адрес',
        onlineMeetingLink: 'https://meet.example.com/room',
      },
      version: 0,
    }))

    const { useBookingStore } = await loadStore()

    expect(useBookingStore.getState()).toMatchObject({
      masterId: 'master-restored',
      rescheduleId: 'booking-restored',
      date: '2026-07-23',
      time: '15:00',
      remind: false,
      clientAddress: 'Сохранённый адрес',
      onlineMeetingLink: 'https://meet.example.com/room',
    })
  })

  it('переживает module reload внутри scope и не переносит draft/auth в независимый scope', async () => {
    const localA = new MemoryStorage()
    const sessionA = new MemoryStorage()
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localA })
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: sessionA })
    const first = await loadStore()
    first.useBookingStore.getState().setMasterId('master-scope-a')
    first.useBookingStore.getState().setService(createClientService(), 'Уход')
    first.useBookingStore.getState().setDateTime('2026-07-24', '16:00')
    localA.setItem('clientToken', 'client-scope-a-token')
    localA.setItem('clientId', 'client-scope-a')
    localA.setItem('masterToken', 'master-scope-a-token')

    const reloaded = await loadStore()
    expect(reloaded.useBookingStore.getState()).toMatchObject({
      masterId: 'master-scope-a',
      categoryName: 'Уход',
      date: '2026-07-24',
      time: '16:00',
    })

    const localB = new MemoryStorage()
    const sessionB = new MemoryStorage()
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localB })
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: sessionB })
    vi.resetModules()
    const [{ useBookingStore: isolatedBookingStore }, { useAuthStore: isolatedAuthStore }] = await Promise.all([
      import('./booking.store'),
      import('./auth.store'),
    ])
    await isolatedAuthStore.getState().init()

    expect(isolatedBookingStore.getState()).toMatchObject({
      masterId: '',
      service: null,
      date: '',
      time: '',
    })
    expect(isolatedAuthStore.getState()).toMatchObject({ token: null, clientId: null })
    expect(localB.getItem('masterToken')).toBeNull()
    expect(sessionB.getItem('booking-draft')).toBeNull()
  })
})
