import { describe, expect, it } from 'vitest'

import { bookingRouteAddress, formatBookingAddress, parseBookingAddress, yandexRouteUrl } from './bookingAddress'

describe('bookingAddress', () => {
  it('собирает адрес, реквизиты помещения и комментарий отдельными строками', () => {
    expect(formatBookingAddress(
      ' Москва, Серебряническая набережная, 29 ',
      { floor: ' 7 ', apartment: '104', intercom: '123#' },
      ' Вход со двора ',
    )).toBe('Москва, Серебряническая набережная, 29\nэтаж 7, кв./офис 104, домофон 123#\nВход со двора')
  })

  it('выделяет адрес дома из нового и старого формата', () => {
    expect(bookingRouteAddress('Москва, Дом 1\nэтаж 7, кв./офис 15')).toBe('Москва, Дом 1')
    expect(bookingRouteAddress('Москва, Дом 1, кв. 15, этаж 7')).toBe('Москва, Дом 1')
  })

  it('разбирает реквизиты помещения и многострочный комментарий', () => {
    expect(parseBookingAddress(
      'Москва, Серебряническая набережная, 29\nэтаж 7, кв./офис 104, домофон 123#\nСлева у входа есть подвал\nТам справа будет окно',
    )).toEqual({
      address: 'Москва, Серебряническая набережная, 29',
      floor: '7',
      apartment: '104',
      intercom: '123#',
      comment: 'Слева у входа есть подвал\nТам справа будет окно',
    })
  })

  it('строит автомобильный маршрут от адреса мастера, если он заполнен', () => {
    const url = new URL(yandexRouteUrl(
      { lat: 55.7558, lng: 37.6176, address: 'Адрес мастера' },
      'Москва, Дом 1',
    ))

    expect(url.origin + url.pathname).toBe('https://yandex.ru/maps/')
    expect(url.searchParams.get('mode')).toBe('routes')
    expect(url.searchParams.get('rtext')).toBe('Адрес мастера~Москва, Дом 1')
    expect(url.searchParams.get('rtt')).toBe('auto')
  })

  it('использует координаты мастера, если адрес не заполнен', () => {
    const url = new URL(yandexRouteUrl(
      { lat: 55.7558, lng: 37.6176, address: null },
      'Москва, Дом 1',
    ))

    expect(url.searchParams.get('rtext')).toBe('55.7558,37.6176~Москва, Дом 1')
  })
})
