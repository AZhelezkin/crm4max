import Skeleton from '@/components/Skeleton'

/**
 * Skeleton-плейсхолдер списка услуг на ServiceSelectPage.
 *
 * Реальный SectionTitle: padding 16/8/4, caption3Caps (h=16) — мимикрируем
 * 14px-плашку шириной ~110.
 *
 * Реальный ServiceItem: padding 16+16=32 + (title 24 + description ≈ 32 +
 * price-row 24) = ~112. Берём 108 как медиану.
 */
export default function ServiceListSkeleton() {
  return (
    <>
      <div style={{ padding: '16px 8px 4px' }}>
        <Skeleton width={110} height={14} radius={7} />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} height={108} radius={20} style={{ width: '100%' }} />
      ))}
    </>
  )
}
