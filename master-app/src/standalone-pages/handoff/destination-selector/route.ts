export const DESTINATION_SELECTOR_START_PREFIX = 'm-dest-'

export function parseDestinationSelectorStartParam(value?: string | null): string | null {
  if (!value?.startsWith(DESTINATION_SELECTOR_START_PREFIX)) return null
  const token = value.slice(DESTINATION_SELECTOR_START_PREFIX.length).trim()
  return token ? token : null
}

export function isDestinationSelectorStartParam(value?: string | null): boolean {
  return parseDestinationSelectorStartParam(value) !== null
}
