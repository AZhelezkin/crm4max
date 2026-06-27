import { api } from '@/api/client'
import type { DestinationSelectorContextResponse, DestinationSelectorSaveResponse } from './types'

export async function getDestinationSelectorContext(token: string): Promise<DestinationSelectorContextResponse> {
  const { data } = await api.get<DestinationSelectorContextResponse>(`/master-assistant/destination-selector/${token}`)
  return data
}

export async function saveDestinationSelectorAddress(token: string, clientAddress: string): Promise<DestinationSelectorSaveResponse> {
  const { data } = await api.post<DestinationSelectorSaveResponse>(`/master-assistant/destination-selector/${token}`, { clientAddress })
  return data
}
