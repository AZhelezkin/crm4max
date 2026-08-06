import { api } from './client'
import type { Client } from '@/types'

export const clientsApi = {
  list: () => api.get<Client[]>('/clients').then((r) => r.data),

  create: (data: { name: string; phone?: string | null }) =>
    api.post<Client>('/clients', data).then((r) => r.data),

  update: (id: string, data: { name?: string; phone?: string | null }) =>
    api.patch<Client>(`/clients/${id}`, data).then((r) => r.data),

  setBlocked: (id: string, isBlocked: boolean) =>
    (isBlocked
      ? api.put<Client>(`/clients/${id}/block`)
      : api.delete<Client>(`/clients/${id}/block`)
    ).then((r) => r.data),

  remove: (id: string) => api.delete(`/clients/${id}`).then((r) => r.data),
}
