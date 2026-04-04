import { api } from './client';
export const authApi = {
    loginWithMax: (params) => api.post('/auth/max', {
        ...params,
        role: 'client',
    }).then((r) => r.data),
};
