import { api } from './client';
export const authApi = {
    loginWithMax: (params) => api.post('/auth/max', {
        ...params,
        role: 'master',
    }).then((r) => r.data),
};
