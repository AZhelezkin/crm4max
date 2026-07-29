export interface BookingAddressDetails {
  floor: string
  apartment: string
  intercom: string
}

export interface ParsedBookingAddress extends BookingAddressDetails {
  address: string
  comment: string
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

export function parseBookingAddress(value: string): ParsedBookingAddress {
  const lines = value.split('\n').map((line) => line.trim()).filter(Boolean)
  const address = bookingRouteAddress(lines[0] ?? '')
  const detailSource = lines.length > 1 ? lines[1] : lines[0] ?? ''
  const floor = detailSource.match(/(?:^|,\s*)этаж\s+([^,]+)/i)?.[1]?.trim() ?? ''
  const apartment = detailSource.match(/(?:^|,\s*)(?:кв\.\/офис|кв\.?|квартира|офис)\s+([^,]+)/i)?.[1]?.trim() ?? ''
  const intercom = detailSource.match(/(?:^|,\s*)домофон\s+([^,]+)/i)?.[1]?.trim() ?? ''
  const hasDetails = Boolean(floor || apartment || intercom)

  return {
    address,
    floor,
    apartment,
    intercom,
    comment: lines.slice(hasDetails ? 2 : 1).join('\n'),
  }
}

export function yandexRouteUrl(
  origin: { lat: number | null; lng: number | null; address: string | null },
  destination: string,
): string {
  const from = origin.address?.trim()
    || (origin.lat != null && origin.lng != null ? `${origin.lat},${origin.lng}` : '')
  const params = new URLSearchParams({ mode: 'routes', rtext: `${from}~${destination}`, rtt: 'auto' })
  return `https://yandex.ru/maps/?${params}`
}
