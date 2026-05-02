import Skeleton from '@/components/Skeleton'

/**
 * Skeleton-плейсхолдер списка категорий на CategorySelectPage.
 *
 * Каждая категория-кнопка: padding 16/16/16/20, аватар 44×44 + текст +
 * chevron, итого высота строки ~76. Радиус 20 как у реальных surfaceTransparent-карточек.
 */
export default function CategoryListSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} height={76} radius={20} style={{ width: '100%' }} />
      ))}
    </>
  )
}
