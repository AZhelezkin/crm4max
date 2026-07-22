import { afterEach, describe, expect, it } from 'vitest'

import { installTopOverscrollGuard } from './topOverscrollGuard'

let stop: (() => void) | null = null

afterEach(() => {
  stop?.()
  stop = null
  document.body.innerHTML = ''
  setScrollTop(document.body, 0)
})

/** jsdom не считает layout — задаём прокрутку явно. */
function setScrollTop(el: HTMLElement, value: number) {
  Object.defineProperty(el, 'scrollTop', { configurable: true, value })
}

/** jsdom не умеет TouchEvent — собираем событие с нужными полями вручную. */
function touch(target: EventTarget, type: 'touchstart' | 'touchmove', clientY: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', { value: [{ clientY }] })
  target.dispatchEvent(event)
  return event
}

/** Жест: палец вниз (dy > 0) — то, чем закрывается мини-приложение в Max. */
function pullDown(target: EventTarget) {
  touch(target, 'touchstart', 100)
  return touch(target, 'touchmove', 160)
}

describe('topOverscrollGuard', () => {
  it('гасит протяжку вниз, когда страница уже в самом верху', () => {
    stop = installTopOverscrollGuard()

    expect(pullDown(document.body).defaultPrevented).toBe(true)
  })

  it('не мешает обычной прокрутке вверх', () => {
    stop = installTopOverscrollGuard()

    touch(document.body, 'touchstart', 160)
    expect(touch(document.body, 'touchmove', 100).defaultPrevented).toBe(false)
  })

  it('не мешает, когда страница прокручена вниз', () => {
    setScrollTop(document.body, 120)
    stop = installTopOverscrollGuard()

    expect(pullDown(document.body).defaultPrevented).toBe(false)
  })

  it('не мешает вложенному скроллеру, которому есть куда ехать вверх', () => {
    const list = document.createElement('div')
    list.style.overflowY = 'auto'
    Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 500 })
    Object.defineProperty(list, 'clientHeight', { configurable: true, value: 200 })
    setScrollTop(list, 80)
    const row = document.createElement('div')
    list.append(row)
    document.body.append(list)
    stop = installTopOverscrollGuard()

    expect(pullDown(row).defaultPrevented).toBe(false)
  })

  it('гасит жест во вложенном скроллере, который уже в самом верху', () => {
    const list = document.createElement('div')
    list.style.overflowY = 'auto'
    Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 500 })
    Object.defineProperty(list, 'clientHeight', { configurable: true, value: 200 })
    setScrollTop(list, 0)
    const row = document.createElement('div')
    list.append(row)
    document.body.append(list)
    stop = installTopOverscrollGuard()

    expect(pullDown(row).defaultPrevented).toBe(true)
  })

  // Лайтбокс фото (client/pages/ServiceDetailPage, MasterCardPage) глушит
  // всплытие тач-событий — guard обязан работать и там, поэтому слушатели
  // висят в фазе перехвата.
  it('работает, даже если компонент вызывает stopPropagation', () => {
    const lightbox = document.createElement('div')
    document.body.append(lightbox)
    lightbox.addEventListener('touchstart', (e) => e.stopPropagation())
    lightbox.addEventListener('touchmove', (e) => e.stopPropagation())
    stop = installTopOverscrollGuard()

    expect(pullDown(lightbox).defaultPrevented).toBe(true)
  })

  it('снимает слушатели после отписки', () => {
    const remove = installTopOverscrollGuard()
    remove()

    expect(pullDown(document.body).defaultPrevented).toBe(false)
  })
})
