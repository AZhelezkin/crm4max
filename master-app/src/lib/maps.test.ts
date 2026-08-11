import { afterEach, describe, expect, it, vi } from 'vitest'
import { systemMapsUrl } from './maps'

afterEach(() => vi.restoreAllMocks())

describe('systemMapsUrl', () => {
  it('использует geo scheme на Android', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 15)')
    expect(systemMapsUrl({ address: 'Москва, Дом 1', lat: 55.7, lng: 37.6 })).toBe('geo:55.7,37.6?q=55.7%2C37.6')
  })

  it('использует maps scheme на iPhone', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
    expect(systemMapsUrl({ address: 'Москва, Дом 1' })).toBe('maps:0,0?q=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%2C%20%D0%94%D0%BE%D0%BC%201')
  })
})
