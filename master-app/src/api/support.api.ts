import { api } from './client'

export interface StartSupportResponse {
  ok: true
  botUrl: string
}

/** Включает режим поддержки на бэке (флаг awaitingSupport + промпт боту в чат)
 *  и возвращает URL бота для перехода через openMaxLink. Роль-агностичен:
 *  бэкенд сам определяет мастера/клиента и отвечает через нужного бота. */
export async function startSupport(): Promise<StartSupportResponse> {
  const { data } = await api.post<StartSupportResponse>('/support/start')
  return data
}
