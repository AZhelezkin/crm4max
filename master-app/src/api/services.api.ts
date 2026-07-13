import { api } from './client'
import type { Service, ServicePhoto } from '@/types'

/** Справочник популярных услуг, сгруппированный по секциям (GET /services/popular). */
export interface PopularServiceGroup {
  section: string
  services: { id: string; name: string }[]
}

export const servicesApi = {
  list: () =>
    api.get<Service[]>('/services').then((r) => r.data),

  create: (data: {
    name: string
    description?: string | null
    duration: number
    price: number
    discountPercent?: number | null
    sessionsCount?: number
    photo?: string | null
  }) => api.post<Service>('/services', data).then((r) => r.data),

  update: (id: string, data: {
    name?: string
    description?: string | null
    duration?: number
    price?: number
    discountPercent?: number | null
    sessionsCount?: number
    photo?: string | null
    isActive?: boolean
  }) => api.put<Service>(`/services/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/services/${id}`),

  addWorkPhoto: (serviceId: string, url: string, order?: number) =>
    api.post<ServicePhoto>(`/services/${serviceId}/photos`, { url, order }).then((r) => r.data),

  removeWorkPhoto: (photoId: string) =>
    api.delete(`/services/photos/${photoId}`),

  // Справочник популярных услуг для пикера при создании.
  getPopular: () =>
    api.get<PopularServiceGroup[]>('/services/popular').then((r) => r.data),
}
