import { create } from 'zustand';
export const useBookingStore = create((set) => ({
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
}));
