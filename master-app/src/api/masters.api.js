import { api } from './client';
export const mastersApi = {
    getMe: () => api.get('/masters/me').then((r) => r.data),
    updateProfile: (data) => api.put('/masters/me', data).then((r) => r.data),
    updatePayment: (data) => api.put('/masters/me/payment', data).then((r) => r.data),
    getSlots: (masterId, date, serviceId) => api.get(`/schedule/${masterId}/slots`, { params: { date, serviceId } }).then((r) => r.data),
};
