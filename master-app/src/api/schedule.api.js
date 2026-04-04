import { api } from './client';
export const scheduleApi = {
    get: () => api.get('/schedule/me').then((r) => r.data),
    upsert: (data) => api.put('/schedule/me', data).then((r) => r.data),
};
