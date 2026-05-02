import Skeleton from '@/components/Skeleton'
import { text } from '@/styles/typography'

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/**
 * Skeleton для шага «выбор даты» CalendarPage. Структура та же, что у реального
 * grid-а (3 месяца × month-label + day-of-week + сетка). Чтобы не перегружать
 * экран мерцанием 35 ячеек на месяц, заменили cell-grid на 6 row-strip-ов
 * (имитируют недели) — то же визуальное чтение, в 5× меньше анимаций.
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

          {/* 6 row-strip-ов (имитируют недели). Каждая h=48 r=10 full-width. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={48} radius={10} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
