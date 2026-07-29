import { describe, expect, it } from 'vitest'

import { formatClientAddress } from './clientAddress'

describe('formatClientAddress', () => {
  it('добавляет заполненные детали к адресу', () => {
    expect(formatClientAddress(' Москва, Дом 1 ', ' 15 ', '7', '123#')).toBe(
      'Москва, Дом 1, кв. 15, этаж 7, домофон 123#',
    )
  })

  it('не добавляет пустые детали и не создаёт адрес без дома', () => {
    expect(formatClientAddress('Москва, Дом 1', '', '', '')).toBe('Москва, Дом 1')
    expect(formatClientAddress(null, '15', '7', '123#')).toBeNull()
  })
})
