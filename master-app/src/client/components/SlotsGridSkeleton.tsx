import Skeleton from '@/components/Skeleton'

/**
 * Skeleton-плейсхолдер сетки слотов на time-step CalendarPage.
 * Повторяет layout: 4 колонки, gap=8, ячейка h=69 r=18.
 * Рендерит 8 плейсхолдеров — 2 ряда (типичный день укладывается в 6–12 слотов).
 */
export default function SlotsGridSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} height={69} radius={18} />
      ))}
    </div>
  )
}
