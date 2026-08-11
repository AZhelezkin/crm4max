import { describe, expect, it } from 'vitest'

import { bookingRouteAddress, formatBookingAddress, formatBookingAddressNote, parseBookingAddress, yandexRouteUrl } from './bookingAddress'

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

  it('сохраняет запятые внутри inline legacy-реквизитов', () => {
    expect(parseBookingAddress('Москва, Дом 1, кв. 12, корпус 2, этаж 7')).toEqual({
      address: 'Москва, Дом 1',
      entrance: '',
      floor: '7',
      apartment: '12, корпус 2',
      intercom: '',
      comment: '',
    })
  })

  it('сохраняет inline legacy-реквизиты перед многострочным комментарием', () => {
    expect(parseBookingAddress('Москва, Дом 1, кв. 12, этаж 7\nПозвонить заранее')).toEqual({
      address: 'Москва, Дом 1',
      entrance: '',
      floor: '7',
      apartment: '12',
      intercom: '',
      comment: 'Позвонить заранее',
    })
  })

  it('не удаляет неоднозначный inline legacy-хвост с повторным ключом', () => {
    const parsed = parseBookingAddress('Москва, Дом 1, кв. 12, этаж 7, этаж 8\nПозвонить заранее')

    expect(parsed).toEqual({
      address: 'Москва, Дом 1',
      entrance: '',
      floor: '',
      apartment: '',
      intercom: '',
      comment: 'кв. 12, этаж 7, этаж 8\nПозвонить заранее',
    })
    expect(formatBookingAddressNote({ entrance: parsed.entrance, floor: parsed.floor, apartment: parsed.apartment, intercom: parsed.intercom }, parsed.comment)).toContain('Комментарий: кв. 12, этаж 7, этаж 8')
  })

  it('разбирает реквизиты помещения и многострочный комментарий', () => {
    expect(parseBookingAddress(
      'Москва, Серебряническая набережная, 29\nэтаж 7, кв./офис 104, домофон 123#\nСлева у входа есть подвал\nТам справа будет окно',
    )).toEqual({
      address: 'Москва, Серебряническая набережная, 29',
      entrance: '',
      floor: '7',
      apartment: '104',
      intercom: '123#',
      comment: 'Слева у входа есть подвал\nТам справа будет окно',
    })
  })

  it('обратно разбирает маркированные реквизиты с запятыми и комментарий с названием поля', () => {
    const value = 'Москва, Дом 1\nДополнительно [CRM4MAX/1]:\nЭтаж: 7\nКвартира/офис: 12, корпус 2\nДомофон: 123#\nКомментарий: Домофон не работает, позвоните\nВстречу у подъезда'

    expect(value).toBe('Москва, Дом 1\nДополнительно [CRM4MAX/1]:\nЭтаж: 7\nКвартира/офис: 12, корпус 2\nДомофон: 123#\nКомментарий: Домофон не работает, позвоните\nВстречу у подъезда')
    expect(parseBookingAddress(value)).toEqual({
      address: 'Москва, Дом 1',
      entrance: '',
      floor: '7',
      apartment: '12, корпус 2',
      intercom: '123#',
      comment: 'Домофон не работает, позвоните\nВстречу у подъезда',
    })
  })

  it('не применяет legacy-очистку к первой строке versioned payload', () => {
    const value = 'Москва, Дом 1, кв. 12\nДополнительно [CRM4MAX/1]:\nКомментарий: Позвонить заранее'

    expect(parseBookingAddress(value)).toMatchObject({
      address: 'Москва, Дом 1, кв. 12',
      comment: 'Позвонить заранее',
    })
    expect(bookingRouteAddress(value)).toBe('Москва, Дом 1')
  })

  it('не принимает обычный комментарий за строку реквизитов', () => {
    expect(parseBookingAddress('Москва, Дом 1\nДомофон не работает, позвоните')).toMatchObject({
      intercom: '',
      comment: 'Домофон не работает, позвоните',
    })
    expect(parseBookingAddress('Москва, Дом 1\nДомофон не работает')).toMatchObject({ intercom: '', comment: 'Домофон не работает' })
    expect(parseBookingAddress('Москва, Дом 1\nСначала позвоните\nЭтаж: второй')).toMatchObject({ floor: '', comment: 'Сначала позвоните\nЭтаж: второй' })
    expect(parseBookingAddress('Москва, Дом 1\nДополнительно:\nСначала позвоните')).toMatchObject({
      floor: '',
      apartment: '',
      intercom: '',
      comment: 'Дополнительно:\nСначала позвоните',
    })
    expect(parseBookingAddress('Москва, Дом 1\nДополнительно:\nЭтаж: второй')).toMatchObject({
      floor: '',
      comment: 'Дополнительно:\nЭтаж: второй',
    })
    expect(parseBookingAddress('Москва, Дом 1\nДополнительно:\nЭтаж:\nЭтаж: 7')).toMatchObject({
      floor: '',
      comment: 'Дополнительно:\nЭтаж:\nЭтаж: 7',
    })
    expect(parseBookingAddress('Москва, Дом 1\nКвартира слева от лифта')).toMatchObject({ apartment: '', comment: 'Квартира слева от лифта' })
    expect(parseBookingAddress('Москва, Дом 1\nДомофон временно не работает')).toMatchObject({ intercom: '', comment: 'Домофон временно не работает' })
    expect(parseBookingAddress('Москва, Дом 1\nДомофон 123 не работает')).toMatchObject({ intercom: '', comment: 'Домофон 123 не работает' })
    expect(parseBookingAddress('Москва, Дом 1\nЭтаж второй, позвоните')).toMatchObject({ floor: '', comment: 'Этаж второй, позвоните' })
  })

  it('разбирает одиночные legacy-реквизиты со значением из нескольких слов', () => {
    expect(parseBookingAddress('Москва, Дом 1\nэтаж второй уровень')).toMatchObject({ floor: 'второй уровень', comment: '' })
    expect(parseBookingAddress('Москва, Дом 1\nкв./офис офис 12 А')).toMatchObject({ apartment: 'офис 12 А', comment: '' })
    expect(parseBookingAddress('Москва, Дом 1\nдомофон код 12 34#')).toMatchObject({ intercom: 'код 12 34#', comment: '' })
    expect(parseBookingAddress('Москва, Дом 1\nэтаж 11А')).toMatchObject({ floor: '11А', comment: '' })
    expect(parseBookingAddress('Москва, Дом 1\nкв./офис офис №12')).toMatchObject({ apartment: 'офис №12', comment: '' })
    expect(parseBookingAddress('Москва, Дом 1\nдомофон консьерж')).toMatchObject({ intercom: 'консьерж', comment: '' })
  })

  it('сохраняет пустые строки внутри structured-комментария', () => {
    const value = 'Москва, Дом 1\nДополнительно [CRM4MAX/1]:\nКомментарий: Первая строка\n\nТретья строка'

    expect(parseBookingAddress(value).comment).toBe('Первая строка\n\nТретья строка')
  })

  it('формирует отдельный комментарий без технического маркера в нужном порядке', () => {
    const note = formatBookingAddressNote(
      { entrance: ' 2 ', intercom: ' #402* ', floor: ' 4 ', apartment: ' 402 ' },
      ' Вход со двора ',
    )

    expect(note).toBe('Подъезд: 2\nДомофон: #402*\nЭтаж: 4\nКвартира/офис: 402\nКомментарий: Вход со двора')
    expect(note).not.toContain('CRM4MAX')
  })

  it('разбирает отдельный комментарий приоритетнее legacy-реквизитов адреса', () => {
    expect(parseBookingAddress(
      'Москва, Дом 1\nДополнительно [CRM4MAX/1]:\nЭтаж: 7\nДомофон: 111#',
      'Подъезд: 2\nДомофон: 222#\nЭтаж: 4\nКвартира/офис: 12\nКомментарий: Вход со двора',
    )).toEqual({
      address: 'Москва, Дом 1',
      entrance: '2',
      intercom: '222#',
      floor: '4',
      apartment: '12',
      comment: 'Вход со двора',
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
