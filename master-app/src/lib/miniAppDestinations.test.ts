import { describe, expect, it } from 'vitest'

import { classifyExternalEffect, renderMiniAppDestination } from './miniAppDestinations'

describe('miniAppDestinations', () => {
  it('рендерит exact MAX client bot handoff через start', () => {
    expect(renderMiniAppDestination('max', { kind: 'client-booking-share', masterId: 'master id' })).toEqual({
      status: 'available',
      url: 'https://max.ru/id9706002253_1_bot?start=master%20id',
      channel: 'provider-messenger',
    })
  })

  it('fail closed для Telegram client share и support', () => {
    expect(renderMiniAppDestination('telegram', { kind: 'client-booking-share', masterId: 'master-id' }))
      .toEqual({ status: 'intentionally-unavailable' })
    expect(renderMiniAppDestination('telegram', { kind: 'support', url: 'https://max.ru/support' }))
      .toEqual({ status: 'intentionally-unavailable' })
  })

  it('отклоняет пустой master id и небезопасный support URL', () => {
    expect(renderMiniAppDestination('max', { kind: 'client-booking-share', masterId: '' })).toEqual({ status: 'invalid' })
    expect(renderMiniAppDestination('max', { kind: 'support', url: 'javascript:alert(1)' })).toEqual({ status: 'invalid' })
  })

  it.each([
    ['https://example.test', 'external-https'],
    ['tel:+79990000000', 'telephone'],
    ['geo:55,37', 'map'],
    ['maps:0,0?q=test', 'map'],
    ['javascript:alert(1)', null],
  ] as const)('классифицирует effect %s', (url, channel) => {
    expect(classifyExternalEffect(url)).toBe(channel)
  })
})
