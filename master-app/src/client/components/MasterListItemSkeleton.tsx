import Skeleton from '@/components/Skeleton'

/**
 * Skeleton-плейсхолдер для master-карточки на ConfirmPage / SuccessPage.
 * Повторяет shell реального listItem (surfaceTransparent rx=20 padding 16/20 gap 12)
 * + аватар 44×44 + 2 строки текста + правая «звёздочка-рейтинг» 46×20.
 */
export default function MasterListItemSkeleton() {
  return (
    <div style={{
      background: 'var(--color-surface-transparent)',
      borderRadius: 20,
      padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <Skeleton width={44} height={44} radius={22} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Skeleton width="55%" height={20} radius={10} />
        <Skeleton width="75%" height={14} radius={7} />
      </div>
      <Skeleton width={46} height={20} radius={10} />
    </div>
  )
}
