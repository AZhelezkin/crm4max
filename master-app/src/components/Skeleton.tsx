import type { CSSProperties, ReactNode } from 'react'

/**
 * Skeleton-плейсхолдер с shimmer-анимацией (см. .skeleton в index.css).
 *
 * Использование:
 *   <Skeleton width={207} height={28} radius={14} />
 *   <Skeleton width="100%" height={68} radius={18} />
 *
 * Для контейнеров (не просто rect) можно вкладывать дочерние Skeleton-ы,
 * передав `as="container"` и обычный layout через `style`.
 */
type Props = {
  width?: number | string
  height?: number | string
  /** borderRadius в px; по умолчанию 4. Для круга передать height/2 или 9999. */
  radius?: number | string
  /** Контейнерный режим: без shimmer, дочерние skeleton-ы анимируются сами. */
  as?: 'container'
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export default function Skeleton({
  width, height, radius = 4, as, className, style, children,
}: Props) {
  return (
    <div
      className={(as === 'container' ? '' : 'skeleton ') + (className ?? '')}
      style={{
        width, height,
        borderRadius: radius,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
