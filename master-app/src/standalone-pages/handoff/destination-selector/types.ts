export type DestinationSelectorContextStatus =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'expired'
  | 'used'
  | 'stale'
  | 'draft_not_found'
  | 'draft_incomplete'
  | 'draft_not_awaiting_address'

export type DestinationAddressPurpose = 'client_address' | 'master_location'

export interface DestinationSelectorCoords {
  lat: number
  lng: number
}

export interface DestinationSelectorContextData {
  addressPurpose?: DestinationAddressPurpose
  clientName: string
  clientPhone?: string | null
  serviceName: string
  date: string
  time: string
  clientAddress?: string | null
  masterLocation?: string | null
  masterLat?: number | null
  masterLng?: number | null
  expiresAt: string
  draftVersion: number
}

export type DestinationSelectorContextResponse =
  | { status: 'ok'; data: DestinationSelectorContextData }
  | { status: DestinationSelectorContextStatus }

export type DestinationSelectorSaveStatus =
  | 'invalid_address'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'expired'
  | 'used'
  | 'stale'
  | 'draft_not_found'
  | 'draft_incomplete'
  | 'draft_not_awaiting_address'
  | 'confirmation_send_failed'

export type DestinationSelectorSaveResponse =
  | { status: 'ok' }
  | { status: DestinationSelectorSaveStatus }
