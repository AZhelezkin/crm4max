export const ONLINE_MEETING_LINK_MAX_LENGTH = 2048

export function normalizeOnlineMeetingLink(value: string): string | null {
  const normalized = value.trim()
  if (!normalized || normalized.length > ONLINE_MEETING_LINK_MAX_LENGTH || /[\u0000-\u001F\u007F]/.test(normalized)) return null
  try {
    const url = new URL(normalized)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.href.length <= ONLINE_MEETING_LINK_MAX_LENGTH ? url.href : null
  } catch {
    return null
  }
}
