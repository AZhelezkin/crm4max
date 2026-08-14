import axios from 'axios'

import { api } from './client'

export interface MessengerProfileLinkResponse {
  destination: 'max' | 'telegram'
  url: string
  expiresIn: number
}

export interface MessengerProfileLinkLaunchRequest {
  provider: 'MAX' | 'TELEGRAM'
  init_data: string
}

export interface MessengerProfileLinkPreview {
  status: 'ready'
  sourceProvider: 'MAX' | 'TELEGRAM'
  destinationProvider: 'MAX' | 'TELEGRAM'
  expiresIn: number
}

export async function createMessengerProfileLink(): Promise<MessengerProfileLinkResponse> {
  const { data } = await api.post<MessengerProfileLinkResponse>('/profile-links')
  return data
}

export async function previewMessengerProfileLink(
  request: MessengerProfileLinkLaunchRequest,
): Promise<MessengerProfileLinkPreview> {
  const { data } = await api.post<MessengerProfileLinkPreview>('/profile-links/preview', request)
  return data
}

export async function confirmMessengerProfileLink(
  request: MessengerProfileLinkLaunchRequest,
): Promise<void> {
  await api.post('/profile-links/confirm', request)
}

export function messengerProfileLinkErrorMessage(error: unknown): string {
  const code = axios.isAxiosError(error) ? error.response?.data?.code : undefined
  if (code === 'LINK_INVALID_OR_EXPIRED') return 'Ссылка для связывания профилей истекла или уже использована. Запросите новую ссылку.'
  if (code === 'LINK_CONFLICT' || code === 'PROFILE_LINK_CONFLICT') return 'Один из профилей уже связан с другим профилем.'
  if (code === 'INVALID_LINK' || code === 'INVALID_LINK_TOKEN') return 'Ссылка для связывания профилей недействительна.'
  return 'Не удалось связать профили. Попробуйте открыть ссылку снова.'
}
