import { api } from './client';
export const mastersApi = {
    getById: (id) => api.get(`/masters/${id}`).then((r) => r.data),
    getSlots: (masterId, date, serviceId) => api.get(`/schedule/${masterId}/slots`, { params: { date, serviceId } }).then((r) => r.data),
};
