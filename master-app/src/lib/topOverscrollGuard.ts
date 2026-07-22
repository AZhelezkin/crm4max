/**
 * Фолбэк к WebAppSetupSwipesBehavior (см. lib/bridge.ts): если клиент Max не
 * поддерживает управление жестом, гасим «протяжку вниз» на уровне тач-событий.
 *
 * Идея: нативная шторка начинает закрываться, когда WebView сообщает, что
 * прокручивать больше некуда. Если на touchmove вниз в самом верху вызвать
 * preventDefault(), браузер не отдаёт оверскролл — и нативный распознаватель
 * жеста в большинстве WebView остаётся ни с чем.
 *
 * Важно: гасим только жест «вниз в самом верху». Любой скролл внутри вложенных
 * прокручиваемых блоков (списки, портал-модалки) и вся прокрутка вверх работают
 * как обычно — иначе экран стал бы «залипшим».
 */
export function installTopOverscrollGuard(): () => void {
  let startY = 0

  const onTouchStart = (e: TouchEvent) => {
    startY = e.touches[0]?.clientY ?? 0
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
      if (scrollable && node.scrollTop > 0) return
      node = node.parentElement
    }

    // Скроллер страницы — <body> (html{overflow:hidden}, см. index.css).
    if (document.body.scrollTop > 0) return

    e.preventDefault()
  }

  document.addEventListener('touchstart', onTouchStart, { passive: true })
  // passive:false обязателен — иначе preventDefault игнорируется.
  document.addEventListener('touchmove', onTouchMove, { passive: false })

  return () => {
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
  }
}
