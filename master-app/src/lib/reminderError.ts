import axios from 'axios'

export function reminderRetryMessage(error: unknown): string | null {
  if (!axios.isAxiosError<{ retryAt?: string }>(error) || error.response?.status !== 429) return null
  const retryAt = Date.parse(error.response.data?.retryAt ?? '')
  if (!Number.isFinite(retryAt)) return null
  const minutes = Math.max(1, Math.ceil((retryAt - Date.now()) / 60_000))
  const parts: string[] = []
  const days = Math.floor(minutes / 1_440)
  const hours = Math.floor((minutes % 1_440) / 60)
  const restMinutes = minutes % 60
  if (days) parts.push(`${days} ${days === 1 ? 'день' : days >= 2 && days <= 4 ? 'дня' : 'дней'}`)
  if (hours) parts.push(`${hours} ${hours === 1 ? 'час' : hours >= 2 && hours <= 4 ? 'часа' : 'часов'}`)
  if (!days && restMinutes) parts.push(`${restMinutes} ${restMinutes === 1 ? 'минуту' : restMinutes >= 2 && restMinutes <= 4 ? 'минуты' : 'минут'}`)
  return `Можно отправить через ${parts.join(' ')}`
}
