import { describe, expect, it } from 'vitest'

import {
  DESTINATION_SELECTOR_START_PREFIX,
  isDestinationSelectorStartParam,
  parseDestinationSelectorStartParam,
} from './route'

describe('destination selector start parameter', () => {
  it('извлекает token после exact prefix', () => {
    expect(parseDestinationSelectorStartParam(`${DESTINATION_SELECTOR_START_PREFIX}token-123`)).toBe('token-123')
    expect(isDestinationSelectorStartParam(`${DESTINATION_SELECTOR_START_PREFIX}token-123`)).toBe(true)
  })

  it.each([
    undefined,
    null,
    '',
    'mmode',
    'dest-token-123',
    'M-dest-token-123',
    `${DESTINATION_SELECTOR_START_PREFIX}`,
    `${DESTINATION_SELECTOR_START_PREFIX}   `,
  ])('отклоняет неподдерживаемое значение %s', (value) => {
    expect(parseDestinationSelectorStartParam(value)).toBeNull()
    expect(isDestinationSelectorStartParam(value)).toBe(false)
  })

  it('trim только внешние пробелы token', () => {
    expect(parseDestinationSelectorStartParam(`${DESTINATION_SELECTOR_START_PREFIX}  token-123  `)).toBe('token-123')
  })
})
