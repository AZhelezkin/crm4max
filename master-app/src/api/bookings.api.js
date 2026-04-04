import { api } from './client';
export const bookingsApi = {
    list: (params) => api.get('/bookings', { params }).then((r) => r.data),
    getById: (id) => api.get(`/bookings/${id}`).then((r) => r.data),
    create: (data) => api.post('/bookings', data).then((r) => r.data),
    confirmPayment: (id) => api.post(`/bookings/${id}/confirm-payment`).then((r) => r.data),
    reschedule: (id, data) => api.post(`/bookings/${id}/reschedule`, data).then((r) => r.data),
    cancel: (id) => api.post(`/bookings/${id}/cancel`).then((r) => r.data),
};
