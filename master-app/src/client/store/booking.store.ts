import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { BookingDraft, BookingReminder, Service } from '@client/types'
import type { ClientMasterSource } from '@/lib/metrics'

interface BookingState extends BookingDraft {
  /** Ссылка на профиль текущего мастера в MAX (для гейта раздела «Сообщения»). */
  masterProfileLink: string | null
  /** Если задан — флоу не создаёт новую запись, а переносит существующую (date/time). */
  rescheduleId: string | null
  masterSource: ClientMasterSource
  setMasterId: (id: string) => void
  setMasterSource: (source: ClientMasterSource) => void
  setMasterProfileLink: (link: string | null) => void
  setRescheduleId: (id: string | null) => void
  setService: (service: Service, categoryName?: string | null) => void
  setDateTime: (date: string, time: string) => void
  /** Установить/заменить слот курса по индексу сеанса (0..N-1). */
  setSlot: (index: number, date: string, time: string) => void
  setSlots: (slots: { date: string; time: string }[]) => void
  clearSlots: () => void
  setRemind: (remind: boolean) => void
  setReminder: (reminder: BookingReminder) => void
  setClientAddress: (addr: string | null) => void
  setOnlineMeetingLink: (link: string | null) => void
  setClientApartment: (apartment: string) => void
  setClientFloor: (floor: string) => void
  setClientIntercom: (intercom: string) => void
  reset: () => void
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      masterId: '',
      masterProfileLink: null,
      rescheduleId: null,
      masterSource: 'stored',
      service: null,
      categoryName: null,
      date: '',
      time: '',
      slots: [],
      remind: true,
      reminder: 'ONE_HOUR',
      clientAddress: null,
      onlineMeetingLink: null,
      clientApartment: '',
      clientFloor: '',
      clientIntercom: '',

      setMasterId: (masterId) => set({ masterId }),
      setMasterSource: (masterSource) => set({ masterSource }),
      setMasterProfileLink: (masterProfileLink) => set({ masterProfileLink }),
      setRescheduleId: (rescheduleId) => set({ rescheduleId }),
      // Выбор услуги = старт новой записи → сбрасываем reschedule-режим (persisted store
      // мог сохранить rescheduleId от прерванного переноса). Перенос ставит id ПОСЛЕ.
      setService: (service, categoryName = null) => set({ service, categoryName, rescheduleId: null, onlineMeetingLink: null }),
      setDateTime: (date, time) => set({ date, time }),
      setSlot: (index, date, time) => set((s) => {
        const slots = [...s.slots]
        slots[index] = { date, time }
        return { slots }
      }),
      setSlots: (slots) => set({ slots }),
      clearSlots: () => set({ slots: [] }),
      setRemind: (remind) => set({ remind, reminder: remind ? 'ONE_HOUR' : 'NONE' }),
      setReminder: (reminder) => set({ reminder, remind: reminder !== 'NONE' }),
      setClientAddress: (clientAddress) => set({ clientAddress }),
      setOnlineMeetingLink: (onlineMeetingLink) => set({ onlineMeetingLink }),
      setClientApartment: (clientApartment) => set({ clientApartment }),
      setClientFloor: (clientFloor) => set({ clientFloor }),
      setClientIntercom: (clientIntercom) => set({ clientIntercom }),
      reset: () => set((s) => ({ masterId: s.masterId, masterProfileLink: s.masterProfileLink, rescheduleId: null, service: null, categoryName: null, date: '', time: '', slots: [], remind: true, reminder: 'ONE_HOUR', clientAddress: null, onlineMeetingLink: null, clientApartment: '', clientFloor: '', clientIntercom: '' })),
    }),
    {
      name: 'booking-draft',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
