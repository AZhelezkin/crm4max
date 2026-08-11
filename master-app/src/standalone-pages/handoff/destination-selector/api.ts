import { api } from '@/api/client'
import type {
  DestinationSelectorAddressInput,
  DestinationSelectorContextResponse,
  DestinationSelectorMasterLocationInput,
  DestinationSelectorSaveResponse,
} from './types'

export async function getDestinationSelectorContext(token: string): Promise<DestinationSelectorContextResponse> {
  const { data } = await api.get<DestinationSelectorContextResponse>(`/master-assistant/destination-selector/${token}`)
  return data
}

export async function saveDestinationSelectorAddress(token: string, input: DestinationSelectorAddressInput): Promise<DestinationSelectorSaveResponse> {
  const { data } = await api.post<DestinationSelectorSaveResponse>(`/master-assistant/destination-selector/${token}`, input)
  return data
}

export async function saveDestinationSelectorMasterLocation(
  token: string,
  input: DestinationSelectorMasterLocationInput,
): Promise<DestinationSelectorSaveResponse> {
  const { data } = await api.post<DestinationSelectorSaveResponse>(`/master-assistant/destination-selector/${token}`, input)
  return data
}
