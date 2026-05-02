import Skeleton from '@/components/Skeleton'
import { text } from '@/styles/typography'

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/**
 * Skeleton-плейсхолдер для шага «выбор даты» в CalendarPage.
 * Повторяет layout 1-в-1: 3 месяца × (label + day-of-week + 5×7 ячеек).
 *
 * Лейблы дней недели рендерятся реальным текстом — они статичны и не зависят
 * от данных. Лейбл месяца и ячейки — шиммер.
 */
export default function CalendarDateSkeleton() {
  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: '0 16px 32px',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      {[0, 1, 2].map((mi) => (
        <div key={mi} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Month label placeholder — caption3Caps shape (h=14, w~110) */}
          <div style={{ paddingLeft: 6 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '14px 4px 14px 8px',
            }}>
              <Skeleton width={110} height={14} radius={7} />
            </div>
          </div>

          {/* Day-of-week labels (статичные) — h=48, body2Medium, secondary. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', width: '100%' }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{
                height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...text.body2Medium,
                color: 'var(--color-on-surface-secondary)',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Cell grid 5×7 — каждый плейсхолдер minH=56 padding 8/4 r=10. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} style={{
                minHeight: 56,
                padding: '8px 4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Skeleton width="100%" height={40} radius={10} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
