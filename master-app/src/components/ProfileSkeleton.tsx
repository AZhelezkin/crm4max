import Skeleton from '@/components/Skeleton'

/**
 * Skeleton-загрузка для ProfilePage (мастерская карточка профиля).
 * Повторяет MasterCardSkeleton без блока 4-х chip-кнопок (их у мастера нет):
 * hero (avatar + name + subtitle), 3 таба, 3 list-item-карточки.
 *
 * Глобальный hero-градиент со скруглёнными верхними углами рисуется на
 * `#root > div` (см. index.css), поэтому здесь обёртки не нужны.
 */
export default function ProfileSkeleton() {
  return (
    <div style={{ minHeight: '100dvh' }}>
      {/* HERO (paddingTop:16, paddingBottom:24) — аватар 104×104 + name/subtitle. */}
      <div style={{ position: 'relative', paddingTop: 16, paddingBottom: 24 }}>
        <Skeleton
          width={104}
          height={104}
          radius={52}
          style={{ margin: '0 auto', display: 'block' }}
        />
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

      {/* Tabs (gap=32, padding 0/30): 3 «Услуги/Фото/Отзывы». */}
      <div style={{
        display: 'flex', gap: 32, padding: '7px 30px',
        marginBottom: 24,
      }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={53} height={18} radius={9} />
        ))}
      </div>

      {/* List (gap=8, padding 0/16): 3 listItem-карточки h=74 rx=20. */}
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
