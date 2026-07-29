export interface BookingAddressDetails {
  floor: string
  apartment: string
  intercom: string
}

export function formatBookingAddress(address: string, details: BookingAddressDetails, comment: string): string {
  const detailLine = [
    details.floor.trim() && `этаж ${details.floor.trim()}`,
    details.apartment.trim() && `кв./офис ${details.apartment.trim()}`,
    details.intercom.trim() && `домофон ${details.intercom.trim()}`,
  ].filter(Boolean).join(', ')

  return [address.trim(), detailLine, comment.trim()].filter(Boolean).join('\n')
}

export function bookingRouteAddress(value: string): string {
  const firstLine = value.split('\n')[0]?.trim() ?? ''
  return firstLine.replace(/,\s*(?:кв\.?|квартира|офис|этаж|домофон)(?:\s|$).*$/i, '').trim()
}

export function yandexRouteUrl(
  origin: { lat: number | null; lng: number | null; address: string | null },
  destination: string,
): string {
  const from = origin.lat != null && origin.lng != null
    ? `${origin.lat},${origin.lng}`
    : origin.address?.trim() ?? ''
  const params = new URLSearchParams({ mode: 'routes', rtext: `${from}~${destination}`, rtt: 'auto' })
  return `https://yandex.ru/maps/?${params}`
}
