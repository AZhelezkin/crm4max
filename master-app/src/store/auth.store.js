import { create } from 'zustand';
import { authApi } from '@/api/auth.api';
import { mastersApi } from '@/api/masters.api';
export const useAuthStore = create((set) => ({
    token: localStorage.getItem('masterToken'),
    master: null,
    isLoading: true,
    init: async () => {
        set({ isLoading: true });
        try {
            const initData = window.WebApp?.initData;
            if (!initData)
                throw new Error('MAX WebApp unavailable');
            window.WebApp?.ready();
            const { token } = await authApi.loginWithMax({ init_data: initData });
            localStorage.setItem('masterToken', token);
            const master = await mastersApi.getMe();
            set({ token, master, isLoading: false });
        }
        catch {
            // Вне Max — используем сохранённый токен
            const token = localStorage.getItem('masterToken');
            if (token) {
                try {
                    const master = await mastersApi.getMe();
                    set({ token, master, isLoading: false });
                    return;
                }
                catch {
                    localStorage.removeItem('masterToken');
                }
            }
            set({ isLoading: false });
        }
    },
    setMaster: (master) => set({ master }),
}));
