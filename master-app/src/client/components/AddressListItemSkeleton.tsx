import Skeleton from '@/components/Skeleton'

/**
 * Skeleton-плейсхолдер для address-карточки на ConfirmPage / BookingDetailPage.
 * Тот же shell, что у master-карточки. Высота:
 *   - lines=1 (ConfirmPage): только описание caption2 → 1 строка
 *   - lines=2 (BookingDetailPage): title callout1 + subtitle "Адрес" caption2
 */
type Props = { lines?: 1 | 2 }

export default function AddressListItemSkeleton({ lines = 1 }: Props) {
  return (
    <div style={{
      background: 'var(--color-surface-transparent)',
      borderRadius: 20,
      padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {lines === 2 && <Skeleton width="80%" height={20} radius={10} />}
        <Skeleton width="60%" height={14} radius={7} />
      </div>
    </div>
  )
}
