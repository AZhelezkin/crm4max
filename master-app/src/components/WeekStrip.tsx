import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'

const WEEK_LETTERS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'] as const // Пн..Вс

/**
 * Свайпаемая недельная полоска на главной мастера.
 *
 * Карусель из трёх панелей [пред., текущая, след. неделя]; трек шириной 300%
 * сдвинут на -33.3333%, так что виден средний. Во время жеста трек следует за
 * пальцем (dragX в px), на отпускании — снап к соседней неделе или возврат.
 * После анимации панели пере-центрируются без «мигания»: они кэшируются по
 * абсолютному индексу недели (key), поэтому та же DOM-нода переезжает в центр,
 * а translateX возвращается на -33.3333% — визуально та же неделя на том же месте.
 *
 * Тап по дню вызывает onSelect(ds); свайп по дню не выбирает день (movedRef).
 * baseMonday — понедельник ТЕКУЩЕЙ недели (offset 0). При изменении focusToken
 * полоска доскролливается к неделе focusDate (кнопка «К сегодняшнему дню» и
 * ссылка «Ближайшая запись» на пустом дне).
 */
function weekOffsetOf(baseMonday: dayjs.Dayjs, date: string): number {
  const target = dayjs(date)
  const targetMonday = target.subtract((target.day() + 6) % 7, 'day')
  // Оба — понедельники 00:00, поэтому разница кратна 7; round гасит DST-дрейф.
  return Math.round(targetMonday.diff(baseMonday, 'day') / 7)
}

export default function WeekStrip({ baseMonday, today, activeDate, onSelect, focusDate = '', focusToken = 0 }: {
  baseMonday: dayjs.Dayjs
  today: string
  activeDate: string
  onSelect: (ds: string) => void
  focusDate?: string
  focusToken?: number
}) {
  const [offset, setOffset] = useState(() => focusDate ? weekOffsetOf(baseMonday, focusDate) : 0)
  const [dragX, setDragX] = useState(0)
  const [animating, setAnimating] = useState(false)

  const viewportRef = useRef<HTMLDivElement | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const dir = useRef<null | 'h' | 'v'>(null)
  const moved = useRef(false)
  const widthRef = useRef(0)
  const pending = useRef<null | 'next' | 'prev' | 'cancel'>(null)

  // Доскролл к неделе focusDate (кнопка «сегодня», ссылка «Ближайшая запись»).
  useEffect(() => {
    if (!focusDate) return
    setOffset(weekOffsetOf(baseMonday, focusDate))
    setDragX(0)
    setAnimating(false)
    // baseMonday — стабильный объект недели; зависимость только от токена.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken])

  const onTouchStart = (e: React.TouchEvent) => {
    if (animating) return
    const t = e.touches[0]
    startX.current = t.clientX
    startY.current = t.clientY
    dir.current = null
    moved.current = false
    widthRef.current = viewportRef.current?.clientWidth ?? 0
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (animating || dir.current === 'v') return
    const t = e.touches[0]
    const dx = t.clientX - startX.current
    const dy = t.clientY - startY.current
    if (dir.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      // Горизонталь — наш свайп; вертикаль — отдаём странице прокрутку.
      dir.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (dir.current === 'v') return
    }
    moved.current = true
    setDragX(dx)
  }

  const onTouchEnd = () => {
    if (dir.current !== 'h') { dir.current = null; return }
    dir.current = null
    const W = widthRef.current || 1
    const threshold = Math.max(40, W * 0.2)
    if (dragX <= -threshold) { pending.current = 'next'; setAnimating(true); setDragX(-W) }
    else if (dragX >= threshold) { pending.current = 'prev'; setAnimating(true); setDragX(W) }
    else if (dragX !== 0) { pending.current = 'cancel'; setAnimating(true); setDragX(0) }
  }

  const onTransitionEnd = (e: React.TransitionEvent) => {
    // Анимируем только transform, поэтому любой transitionend на треке — наш.
    // (propertyName проверяем лишь если он есть: в jsdom он не проставляется.)
    if (e.propertyName && e.propertyName !== 'transform') return
    const p = pending.current
    pending.current = null
    setAnimating(false)
    if (p === 'next') { setOffset((o) => o + 1); setDragX(0) }
    else if (p === 'prev') { setOffset((o) => o - 1); setDragX(0) }
    // 'cancel' — dragX уже вернулся в 0
  }

  const panels = [-1, 0, 1].map((rel) => ({ rel, monday: baseMonday.add((offset + rel) * 7, 'day') }))

  return (
    <div
      ref={viewportRef}
      data-testid="week-strip"
      data-visible-week={baseMonday.add(offset * 7, 'day').format('YYYY-MM-DD')}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        overflow: 'hidden', padding: '8px 12px',
        borderBottom: '1px solid var(--color-secondary-surface-muted)',
        touchAction: 'pan-y',
      }}
    >
      <div
        onTransitionEnd={onTransitionEnd}
        style={{
          display: 'flex', width: '300%',
          transform: `translateX(calc(-33.3333% + ${dragX}px))`,
          transition: animating ? 'transform 0.22s ease' : 'none',
        }}
      >
        {panels.map(({ rel, monday }) => (
          <div key={offset + rel} style={{ width: '33.3333%', display: 'flex', justifyContent: 'space-between' }}>
            {WEEK_LETTERS.map((letter, i) => {
              const d = monday.add(i, 'day')
              const ds = d.format('YYYY-MM-DD')
              const selected = ds === activeDate
              const isToday = ds === today
              const weekend = i >= 5
              // Приоритет цвета: выбранный > сегодня(синий) > выходной(красный) > обычный.
              const letterColor = selected ? 'var(--color-on-surface-secondary)'
                : weekend ? 'var(--color-error-element-muted)'
                : 'var(--color-interactive-element-secondary)'
              const numColor = selected ? 'var(--color-on-surface)'
                : isToday ? 'var(--color-primary-surface)'
                : weekend ? 'var(--color-error-surface-accented)'
                : 'var(--color-interactive-element-accented)'
              return (
                <button
                  key={i}
                  type="button"
                  // Свайп не должен выбирать день: клик после жеста игнорируем.
                  onClick={() => { if (moved.current) { moved.current = false; return } onSelect(ds) }}
                  style={{
                    flex: 1, minWidth: 0, padding: '8px 0 6px', borderRadius: selected ? 16 : 8, cornerShape: selected ? 'squircle' : undefined, border: 'none', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: selected ? 'var(--color-selected-raised-surface)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 11, lineHeight: '13px', fontWeight: 400, letterSpacing: -0.11, color: letterColor }}>{letter}</span>
                  <span style={{ fontSize: 14, lineHeight: '20px', fontWeight: selected ? 700 : 400, letterSpacing: -0.14, color: numColor }}>{d.date()}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
