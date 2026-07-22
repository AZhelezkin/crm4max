/**
 * Фолбэк к WebAppSetupSwipesBehavior (см. lib/bridge.ts): если клиент Max не
 * поддерживает управление жестом, не даём «протяжке вниз» закрыть приложение.
 *
 * Нативная шторка начинает закрываться, когда WebView сообщает, что прокручивать
 * больше некуда. Защит две — по отдельности каждая дырявая:
 *
 * 1. preventDefault на touchmove вниз, когда ехать вверх уже некуда. Работает,
 *    пока жест не начался. Как только браузер начал прокрутку, следующие
 *    touchmove приходят с `cancelable: false` и отменить их нельзя — поэтому
 *    «прокрутил вниз → резко вернулся наверх» проскакивал в оверскролл.
 * 2. Страховка от этого: держим скроллер на 1px ниже нуля (sentinel). Контейнер
 *    никогда не рапортует «я в самом верху», нативный распознаватель жеста не
 *    включается, а инерционный доскролл до нуля гасится клампом. Потерянный
 *    первый пиксель компенсируем распоркой в начале <body> — визуально страница
 *    остаётся на месте.
 *
 * Важно: гасим только жест «вниз в самом верху». Прокрутка вверх и скролл внутри
 * вложенных блоков (списки, портал-модалки) работают как обычно.
 */
const SPACER_ATTR = 'data-overscroll-spacer'

export function installTopOverscrollGuard(): () => void {
  let startY = 0

  const onTouchStart = (e: TouchEvent) => {
    startY = e.touches[0]?.clientY ?? 0
    clampToSentinel()
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!e.cancelable || e.touches.length !== 1) return
    const dy = (e.touches[0]?.clientY ?? 0) - startY
    if (dy <= 0) return // тянут вверх — обычная прокрутка

    // Ищем ближайшего прокручиваемого предка, которому ещё есть куда ехать вверх.
    let node = e.target as HTMLElement | null
    while (node && node !== document.body && node !== document.documentElement) {
      const overflowY = getComputedStyle(node).overflowY
      const scrollable = (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight
      if (scrollable && node.scrollTop > SENTINEL) return
      node = node.parentElement
    }

    // Скроллер страницы — <body> (html{overflow:hidden}, см. index.css).
    if (document.body.scrollTop > SENTINEL) return

    e.preventDefault()
  }

  // Распорка в 1px в начале body: страница уезжает на неё, а не на свой контент.
  const spacer = document.createElement('div')
  spacer.setAttribute(SPACER_ATTR, '')
  spacer.style.cssText = `height:${SENTINEL}px;flex-shrink:0;pointer-events:none`
  document.body.insertBefore(spacer, document.body.firstChild)

  // capture:true — обязательно. React 18 вешает нативные слушатели на #root, и
  // любой компонент со stopPropagation() на тач-событии (лайтбокс фото в
  // client/pages/ServiceDetailPage и MasterCardPage) отрезал бы обработчик на
  // document в фазе всплытия. Перехват идёт до цели, поэтому его не обойти.
  document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
  // passive:false обязателен — иначе preventDefault игнорируется.
  document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
  // scroll на body не всплывает — слушаем в capture на document.
  document.addEventListener('scroll', clampToSentinel, { passive: true, capture: true })
  clampToSentinel()

  return () => {
    document.removeEventListener('touchstart', onTouchStart, { capture: true })
    document.removeEventListener('touchmove', onTouchMove, { capture: true })
    document.removeEventListener('scroll', clampToSentinel, { capture: true })
    spacer.remove()
    if (document.body.scrollTop === SENTINEL) document.body.scrollTop = 0
  }
}

/** Смещение, на котором держим скроллер: 1px хватает, чтобы «низ ≠ верх». */
export const SENTINEL = 1

/**
 * Не даём скроллеру страницы встать ровно в 0. Прокручивать нечего (короткая
 * страница) — выходим: там жест перехватывает preventDefault, ему хватает.
 */
function clampToSentinel() {
  const body = document.body
  if (body.scrollHeight <= body.clientHeight) return
  if (body.scrollTop < SENTINEL) body.scrollTop = SENTINEL
}
