import { Fragment } from 'react'
import Skeleton from '@/components/Skeleton'

/**
 * Skeleton-плейсхолдер для списка записей на MyBookingsPage.
 *
 * Повторяет 1:1 layout реального списка (Figma 8535:43250):
 *   _appointmentSectionTitle (date • day) → divider 8 → row(s) → divider 8 …
 *
 * Section title pt-16 pb-8 px-8 gap-8: «date»-плашка callout1 + 6×6 dot
 * + day-плашка body2.
 * Row: lineWrapper h-60 p-8 (внутри 2×44 line) + cell pl-8 py-8 (2 text rows)
 * + timeCell w-94 pl-16 pr-8 py-8 (2 text rows).
 * Divider — h-8 контейнер с 1px-линией по центру.
 */
function ListDivider() {
  return (
    <div style={{ width: '100%', height: 8, display: 'flex', alignItems: 'center' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--color-divider-low)' }} />
    </div>
  )
}

function SectionTitleSkeleton({ dateW, dayW }: { dateW: number; dayW: number }) {
  return (
    <div style={{
      width: '100%',
      padding: '16px 8px 8px',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {/* «22 Марта» — высота callout1=24 */}
      <Skeleton width={dateW} height={20} radius={10} />
      {/* bullet 6×6 */}
      <Skeleton width={6} height={6} radius={3} />
      {/* «Пятница» — высота body2=24 */}
      <Skeleton width={dayW} height={18} radius={9} />
    </div>
  )
}

function RowSkeleton({ nameW, priceW }: { nameW: number; priceW: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', width: '100%',
    }}>
      {/* lineWrapper h=60 p=8: внутри 2×44 полоса */}
      <div style={{
        height: 60, padding: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center',
      }}>
        <Skeleton width={2} height={44} radius={1} />
      </div>

      {/* cell/theme pl-8 py-8 — 2 строки текста */}
      <div style={{
        flex: 1, minWidth: 0,
        padding: '8px 0 8px 8px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <Skeleton width={nameW} height={20} radius={10} />
        <Skeleton width={priceW} height={16} radius={8} />
      </div>

      {/* timeCell w-94 pl-16 pr-8 py-8 — 2 строки времени */}
      <div style={{
        width: 94, flexShrink: 0,
        padding: '8px 8px 8px 16px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <Skeleton width={50} height={20} radius={10} />
        <Skeleton width={50} height={16} radius={8} />
      </div>
    </div>
  )
}

export default function MyBookingsListSkeleton() {
  // 3 секции с разной длиной плейсхолдеров — выглядит живее, чем повтор.
  const sections = [
    { dateW: 96,  dayW: 80, rows: [{ nameW: 180, priceW: 70 }] },
    { dateW: 104, dayW: 88, rows: [{ nameW: 220, priceW: 90 }, { nameW: 160, priceW: 60 }] },
    { dateW: 88,  dayW: 96, rows: [{ nameW: 200, priceW: 80 }] },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {sections.map((s, si) => (
        <Fragment key={si}>
          <SectionTitleSkeleton dateW={s.dateW} dayW={s.dayW} />
          <ListDivider />
          {s.rows.map((r, ri) => (
            <Fragment key={ri}>
              <RowSkeleton nameW={r.nameW} priceW={r.priceW} />
              <ListDivider />
            </Fragment>
          ))}
        </Fragment>
      ))}
    </div>
  )
}
