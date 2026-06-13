import { api } from './client'
import type { Category, Service, ServicePhoto } from '@/types'

export const categoriesApi = {
  list: () =>
    api.get<Category[]>('/services/categories').then((r) => r.data),

  create: (data: { name: string; description?: string; photo?: string }) =>
    api.post<Category>('/services/categories', data).then((r) => r.data),

  update: (id: string, data: { name?: string; description?: string; photo?: string }) =>
    api.put<Category>(`/services/categories/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/services/categories/${id}`),
}

export const servicesApi = {
  list: () =>
    api.get<Service[]>('/services').then((r) => r.data),

  create: (data: {
    categoryId?: string
    name: string
    description?: string
    duration: number
    price: number
    discountPercent?: number
    sessionsCount?: number
    photo?: string
  }) => api.post<Service>('/services', data).then((r) => r.data),

  update: (id: string, data: {
    categoryId?: string
    name?: string
    description?: string
    duration?: number
    price?: number
    discountPercent?: number
    sessionsCount?: number
    photo?: string
    isActive?: boolean
  }) => api.put<Service>(`/services/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/services/${id}`),

  addWorkPhoto: (serviceId: string, url: string, order?: number) =>
    api.post<ServicePhoto>(`/services/${serviceId}/photos`, { url, order }).then((r) => r.data),

  removeWorkPhoto: (photoId: string) =>
    api.delete(`/services/photos/${photoId}`),
}
