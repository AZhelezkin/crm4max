import type { MiniAppProvider } from './miniAppHost'

export type MiniAppDestination =
  | { kind: 'client-booking-share'; masterId: string }
  | { kind: 'support'; url: string }

export type ExternalEffectChannel =
  | 'external-https'
  | 'provider-messenger'
  | 'telephone'
  | 'map'
  | 'calendar-download'
  | 'same-webview'

export type RenderedDestination =
  | { status: 'available'; url: string; channel: ExternalEffectChannel }
  | { status: 'invalid' }
  | { status: 'intentionally-unavailable' }

const DEFAULT_MAX_CLIENT_BOT = 'id9706002253_1_bot'

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function renderMiniAppDestination(
  provider: MiniAppProvider,
  destination: MiniAppDestination,
): RenderedDestination {
  if (destination.kind === 'client-booking-share') {
    if (provider !== 'max') return { status: 'intentionally-unavailable' }
    if (!destination.masterId.trim()) return { status: 'invalid' }
    const clientBotName = (import.meta.env.VITE_CLIENT_BOT_NAME as string | undefined)?.trim() || DEFAULT_MAX_CLIENT_BOT
    if (!/^[a-zA-Z0-9_]+$/.test(clientBotName)) return { status: 'invalid' }
    return {
      status: 'available',
      url: `https://max.ru/${clientBotName}?start=${encodeURIComponent(destination.masterId)}`,
      channel: 'provider-messenger',
    }
  }

  if (provider !== 'max') return { status: 'intentionally-unavailable' }
  if (!isHttpsUrl(destination.url)) return { status: 'invalid' }
  return { status: 'available', url: destination.url, channel: 'provider-messenger' }
}

export function classifyExternalEffect(url: string): ExternalEffectChannel | null {
  try {
    const protocol = new URL(url).protocol
    if (protocol === 'https:') return 'external-https'
    if (protocol === 'tel:') return 'telephone'
    if (protocol === 'geo:' || protocol === 'maps:') return 'map'
    return null
  } catch {
    return null
  }
}
