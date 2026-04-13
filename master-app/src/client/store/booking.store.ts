import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { BookingDraft, Service } from '@client/types'

interface BookingState extends BookingDraft {
  setMasterId: (id: string) => void
  setService: (service: Service) => void
  setDateTime: (date: string, time: string) => void
  setRemind: (remind: boolean) => void
  reset: () => void
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      masterId: '',
      service: null,
      date: '',
      time: '',
      remind: true,

      setMasterId: (masterId) => set({ masterId }),
      setService: (service) => set({ service }),
      setDateTime: (date, time) => set({ date, time }),
      setRemind: (remind) => set({ remind }),
      reset: () => set({ masterId: '', service: null, date: '', time: '', remind: true }),
    }),
    {
      name: 'booking-draft',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
