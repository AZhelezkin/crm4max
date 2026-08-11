export function mapsUrl(address: string, lat?: number | null, lng?: number | null, label?: string): string {
  const query = lat != null && lng != null
    ? `${lat},${lng}${label ? `(${label})` : ''}`
    : address
  const encodedQuery = encodeURIComponent(query)
  const userAgent = navigator.userAgent
  const isApple = /iPhone|iPad|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  return isApple ? `maps:0,0?q=${encodedQuery}` : `geo:0,0?q=${encodedQuery}`
}
