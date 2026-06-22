import { api } from './client'
import type { Review } from '@client/types'

export const reviewsApi = {
  // Оставить отзыв по завершённой записи (бэкенд проверяет COMPLETED + принадлежность клиенту).
  create: (data: { bookingId: string; rating: number; text?: string }) =>
    api.post<Review>('/reviews', data).then((r) => r.data),
}
