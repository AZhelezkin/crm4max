import { api } from './client';
export const paymentsApi = {
    list: () => api.get('/payments').then((r) => r.data),
};
