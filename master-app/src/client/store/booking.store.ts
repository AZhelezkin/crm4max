import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { BookingDraft, Service } from '@client/types'

interface BookingState extends BookingDraft {
  setMasterId: (id: string) => void
  setService: (service: Service, categoryName?: string | null) => void
  setDateTime: (date: string, time: string) => void
  /** Установить/заменить слот курса по индексу сеанса (0..N-1). */
  setSlot: (index: number, date: string, time: string) => void
  setSlots: (slots: { date: string; time: string }[]) => void
  clearSlots: () => void
  setRemind: (remind: boolean) => void
  setClientAddress: (addr: string | null) => void
  reset: () => void
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      masterId: '',
      service: null,
      categoryName: null,
      date: '',
      time: '',
      slots: [],
      remind: true,
      clientAddress: null,

      setMasterId: (masterId) => set({ masterId }),
      setService: (service, categoryName = null) => set({ service, categoryName }),
      setDateTime: (date, time) => set({ date, time }),
      setSlot: (index, date, time) => set((s) => {
        const slots = [...s.slots]
        slots[index] = { date, time }
        return { slots }
      }),
      setSlots: (slots) => set({ slots }),
      clearSlots: () => set({ slots: [] }),
      setRemind: (remind) => set({ remind }),
      setClientAddress: (clientAddress) => set({ clientAddress }),
      reset: () => set((s) => ({ masterId: s.masterId, service: null, categoryName: null, date: '', time: '', slots: [], remind: true, clientAddress: null })),
    }),
    {
      name: 'booking-draft',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
