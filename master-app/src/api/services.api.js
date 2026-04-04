import { api } from './client';
export const categoriesApi = {
    list: () => api.get('/services/categories').then((r) => r.data),
    create: (data) => api.post('/services/categories', data).then((r) => r.data),
    update: (id, data) => api.put(`/services/categories/${id}`, data).then((r) => r.data),
    remove: (id) => api.delete(`/services/categories/${id}`),
};
export const servicesApi = {
    list: () => api.get('/services').then((r) => r.data),
    create: (data) => api.post('/services', data).then((r) => r.data),
    update: (id, data) => api.put(`/services/${id}`, data).then((r) => r.data),
    remove: (id) => api.delete(`/services/${id}`),
    addWorkPhoto: (serviceId, url, order) => api.post(`/services/${serviceId}/photos`, { url, order }).then((r) => r.data),
    removeWorkPhoto: (photoId) => api.delete(`/services/photos/${photoId}`),
};
