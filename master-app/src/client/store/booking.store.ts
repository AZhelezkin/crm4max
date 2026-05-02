import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { BookingDraft, Service } from '@client/types'

interface BookingState extends BookingDraft {
  setMasterId: (id: string) => void
  setService: (service: Service, categoryName?: string | null) => void
  setDateTime: (date: string, time: string) => void
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
      remind: true,
      clientAddress: null,

      setMasterId: (masterId) => set({ masterId }),
      setService: (service, categoryName = null) => set({ service, categoryName }),
      setDateTime: (date, time) => set({ date, time }),
      setRemind: (remind) => set({ remind }),
      setClientAddress: (clientAddress) => set({ clientAddress }),
      reset: () => set({ masterId: '', service: null, categoryName: null, date: '', time: '', remind: true, clientAddress: null }),
    }),
    {
      name: 'booking-draft',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
