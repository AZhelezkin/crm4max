import { describe, it, expect, beforeEach } from 'vitest'
import { useBookingStore } from './booking.store'
import type { Service } from '@/types'

const FAKE_SERVICE: Service = {
  id: 'svc-1',
  name: 'Мужская стрижка',
  description: null,
  durationMin: 40,
  durationMax: null,
  price: 150000,
  discountPercent: null,
  photo: null,
}

// Сбрасываем store перед каждым тестом
beforeEach(() => {
  useBookingStore.getState().reset()
})

describe('booking.store', () => {
  it('начальное состояние — все поля пустые', () => {
    const state = useBookingStore.getState()
    expect(state.masterId).toBe('')
    expect(state.service).toBeNull()
    expect(state.date).toBe('')
    expect(state.time).toBe('')
  })

  it('setMasterId обновляет masterId', () => {
    useBookingStore.getState().setMasterId('master-42')
    expect(useBookingStore.getState().masterId).toBe('master-42')
  })

  it('setService сохраняет услугу', () => {
    useBookingStore.getState().setService(FAKE_SERVICE)
    const { service } = useBookingStore.getState()
    expect(service?.id).toBe('svc-1')
    expect(service?.name).toBe('Мужская стрижка')
    expect(service?.durationMin).toBe(40)
  })

  it('setDateTime сохраняет дату и время', () => {
    useBookingStore.getState().setDateTime('2025-03-24', '14:00')
    const { date, time } = useBookingStore.getState()
    expect(date).toBe('2025-03-24')
    expect(time).toBe('14:00')
  })

  it('setDateTime перезаписывает предыдущие значения', () => {
    useBookingStore.getState().setDateTime('2025-03-24', '10:00')
    useBookingStore.getState().setDateTime('2025-03-25', '11:00')
    const { date, time } = useBookingStore.getState()
    expect(date).toBe('2025-03-25')
    expect(time).toBe('11:00')
  })

  it('reset очищает весь wizard', () => {
    useBookingStore.getState().setMasterId('master-1')
    useBookingStore.getState().setService(FAKE_SERVICE)
    useBookingStore.getState().setDateTime('2025-03-24', '14:00')

    useBookingStore.getState().reset()

    const state = useBookingStore.getState()
    expect(state.masterId).toBe('')
    expect(state.service).toBeNull()
    expect(state.date).toBe('')
    expect(state.time).toBe('')
  })

  it('wizard flow: последовательные шаги сохраняют состояние', () => {
    // Шаг 1 — выбор мастера
    useBookingStore.getState().setMasterId('master-1')
    // Шаг 2 — выбор услуги
    useBookingStore.getState().setService(FAKE_SERVICE)
    // Шаг 3 — выбор времени
    useBookingStore.getState().setDateTime('2025-03-24', '14:00')

    const state = useBookingStore.getState()
    expect(state.masterId).toBe('master-1')
    expect(state.service?.id).toBe('svc-1')
    expect(state.date).toBe('2025-03-24')
    expect(state.time).toBe('14:00')
  })
})
