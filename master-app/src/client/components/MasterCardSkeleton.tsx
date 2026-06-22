import Skeleton from '@/components/Skeleton'

/**
 * Skeleton-загрузка для MasterCardPage. Повторяет layout 1-в-1 (Figma 8534:13150):
 * hero (avatar + name + subtitle), 4 chip-кнопки, 3 таба, 3 list-item-карточки.
 *
 * Глобальный hero-градиент со скруглёнными верхними углами рисуется на
 * `#root > div` (см. index.css), поэтому здесь обёртки не нужны.
 */
export default function MasterCardSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 95 }}>

      {/* ── HERO (paddingTop: 16, paddingBottom: 24) ───────────────────────── */}
      <div style={{ position: 'relative', paddingTop: 16, paddingBottom: 24 }}>

        {/* Avatar 104×104 (без кольца, как на реальной странице). */}
        <Skeleton
          width={104}
          height={104}
          radius={52}
          style={{ margin: '0 auto', display: 'block' }}
        />

        {/* Name + subtitle (Figma «name description» h=52, абсолютные плашки):
              name 207×28 r=14, top=0, centered
              subtitle 145×14 r=14, top=38, centered. */}
        <div style={{
          position: 'relative',
          width: '100%', height: 52,
          marginTop: 18,
        }}>
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          }}>
            <Skeleton width={207} height={28} radius={14} />
          </div>
          <div style={{
            position: 'absolute', top: 38, left: '50%', transform: 'translateX(-50%)',
          }}>
            <Skeleton width={145} height={14} radius={14} />
          </div>
        </div>
      </div>

      {/* ── 4 chip-buttons (gap=4, padding 0/16, h=68, rx=18) ──────────────── */}
      <div style={{ display: 'flex', gap: 4, padding: '0 16px', marginBottom: 24 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={68} radius={18} style={{ flex: 1, minWidth: 0 }} />
        ))}
      </div>

      {/* ── Tabs (gap=32, padding 0/30): 3 «Услуги/Фото/Отзывы» ─────────────
            Tab-плашка имитирует label+counter: ширина 53, высота 18, radius 9. */}
      <div style={{
        display: 'flex', gap: 32, padding: '7px 30px',
        marginBottom: 24,
      }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={53} height={18} radius={9} />
        ))}
      </div>

      {/* ── List (gap=8, padding 0/16): 3 listItem-карточки h=74 rx=20 ────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '0 16px',
      }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={74} radius={20} style={{ width: '100%' }} />
        ))}
      </div>
    </div>
  )
}
