import { describe, expect, it } from 'vitest'

import { normalizeOnlineMeetingLink, ONLINE_MEETING_LINK_MAX_LENGTH } from './onlineMeetingLink'

describe('normalizeOnlineMeetingLink', () => {
  it('обрезает пробелы у абсолютной HTTPS-ссылки', () => {
    expect(normalizeOnlineMeetingLink('  https://meet.example.com/room  ')).toBe('https://meet.example.com/room')
  })

  it.each([
    '',
    'http://meet.example.com/room',
    'https://user:secret@meet.example.com/room',
    'https://meet.example.com/room\r\nATTENDEE:mailto:test@example.com',
    'not-a-url',
  ])('отклоняет недопустимое значение %j', (value) => {
    expect(normalizeOnlineMeetingLink(value)).toBeNull()
  })

  it('принимает максимум 2048 символов и отклоняет превышение', () => {
    const prefix = 'https://meet.example.com/'
    const maxLengthLink = prefix + 'a'.repeat(ONLINE_MEETING_LINK_MAX_LENGTH - prefix.length)
    expect(normalizeOnlineMeetingLink(maxLengthLink)).toBe(maxLengthLink)
    expect(normalizeOnlineMeetingLink(`${maxLengthLink}a`)).toBeNull()
  })
})
