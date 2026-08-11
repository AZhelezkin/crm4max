export function systemMapsUrl(input: {
  address: string
  lat?: number | null
  lng?: number | null
  label?: string
}): string {
  const query = input.lat != null && input.lng != null
    ? `${input.lat},${input.lng}${input.label ? `(${input.label})` : ''}`
    : input.address
  return isIOS()
    ? `maps:0,0?q=${encodeURIComponent(query)}`
    : input.lat != null && input.lng != null
      ? `geo:${input.lat},${input.lng}?q=${encodeURIComponent(query)}`
      : `geo:0,0?q=${encodeURIComponent(query)}`
}

function isIOS(): boolean {
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return /Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document
}
