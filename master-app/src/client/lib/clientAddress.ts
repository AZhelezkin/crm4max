export function formatClientAddress(
  address: string | null,
  apartment: string,
  floor: string,
  intercom: string,
): string | null {
  const base = address?.trim()
  if (!base) return null

  const details = [
    apartment.trim() && `кв. ${apartment.trim()}`,
    floor.trim() && `этаж ${floor.trim()}`,
    intercom.trim() && `домофон ${intercom.trim()}`,
  ].filter(Boolean)

  return [base, ...details].join(', ')
}
