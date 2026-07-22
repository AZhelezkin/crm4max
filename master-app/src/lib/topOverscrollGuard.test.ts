import { afterEach, describe, expect, it } from 'vitest'

import { SENTINEL, installTopOverscrollGuard } from './topOverscrollGuard'

let stop: (() => void) | null = null

afterEach(() => {
  stop?.()
  stop = null
  document.body.innerHTML = ''
  setScrollTop(document.body, 0)
  setScrollSize(document.body, { scrollHeight: 0, clientHeight: 0 })
})

/** jsdom не считает layout — прокрутку держим в обычном read/write свойстве. */
function setScrollTop(el: HTMLElement, value: number) {
  let current = value
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => current,
    set: (next: number) => { current = next },
  })
}

/** Прокручиваемость (нужна кламперу) — тоже задаём явно. */
function setScrollSize(el: HTMLElement, { scrollHeight, clientHeight }: { scrollHeight: number; clientHeight: number }) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight })
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

  // Вторая линия защиты: жест, который браузер уже начал, отменить нельзя
  // (touchmove приходит с cancelable:false). Поэтому скроллер не должен
  // вставать ровно в 0 — иначе «прокрутил вниз → резко наверх» уходит
  // в оверскролл и закрывает мини-приложение.
  describe('sentinel: скроллер не встаёт ровно в 0', () => {
    function makeScrollablePage() {
      setScrollSize(document.body, { scrollHeight: 2000, clientHeight: 800 })
      setScrollTop(document.body, 0)
    }

    it('сдвигает прокручиваемую страницу на 1px при установке', () => {
      makeScrollablePage()
      stop = installTopOverscrollGuard()

      expect(document.body.scrollTop).toBe(SENTINEL)
    })

    it('возвращает на 1px, когда инерция догнала до нуля', () => {
      makeScrollablePage()
      stop = installTopOverscrollGuard()

      document.body.scrollTop = 0
      document.body.dispatchEvent(new Event('scroll', { bubbles: false }))

      expect(document.body.scrollTop).toBe(SENTINEL)
    })

    it('компенсирует сдвиг распоркой в начале body', () => {
      makeScrollablePage()
      stop = installTopOverscrollGuard()

      const spacer = document.body.firstElementChild as HTMLElement
      expect(spacer.getAttribute('data-overscroll-spacer')).toBe('')
      expect(spacer.style.height).toBe(`${SENTINEL}px`)
    })

    it('не трогает короткую страницу — прокручивать нечего', () => {
      setScrollSize(document.body, { scrollHeight: 600, clientHeight: 800 })
      setScrollTop(document.body, 0)
      stop = installTopOverscrollGuard()

      expect(document.body.scrollTop).toBe(0)
      expect(pullDown(document.body).defaultPrevented).toBe(true)
    })

    it('убирает распорку и сдвиг после отписки', () => {
      makeScrollablePage()
      installTopOverscrollGuard()()

      expect(document.body.querySelector('[data-overscroll-spacer]')).toBeNull()
      expect(document.body.scrollTop).toBe(0)
    })
  })
})
