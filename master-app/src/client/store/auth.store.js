import { create } from 'zustand';
import { authApi } from '@client/api/auth.api';
export const useAuthStore = create((set) => ({
    token: localStorage.getItem('clientToken'),
    clientId: localStorage.getItem('clientId'),
    isLoading: true,
    init: async () => {
        set({ isLoading: true });
        try {
            const initData = window.WebApp?.initData;
            if (!initData)
                throw new Error('MAX WebApp unavailable');
            window.WebApp?.ready();
            const { token, userId } = await authApi.loginWithMax({ init_data: initData });
            localStorage.setItem('clientToken', token);
            localStorage.setItem('clientId', userId);
            set({ token, clientId: userId, isLoading: false });
        }
        catch {
            // Вне Max — используем сохранённый токен
            const token = localStorage.getItem('clientToken');
            const clientId = localStorage.getItem('clientId');
            set({ token, clientId, isLoading: false });
        }
    },
}));
