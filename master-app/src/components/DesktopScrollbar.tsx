import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const DESKTOP_QUERY = '(hover: hover) and (pointer: fine)'
const TRACK_INSET = 16
const THUMB_WIDTH = 4
const RIGHT_GUTTER = 16

interface ThumbState {
  visible: boolean
  height: number
  top: number
  progress: number
}

export default function DesktopScrollbar() {
  const [desktop, setDesktop] = useState(false)
  const [thumb, setThumb] = useState<ThumbState>({ visible: false, height: 0, top: 0, progress: 0 })
  const [dragging, setDragging] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY)
    const update = () => setDesktop(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!desktop) return
    const scroller = document.body
    const update = () => {
      const viewport = scroller.clientHeight
      const content = scroller.scrollHeight
      if (content <= viewport) {
        setThumb({ visible: false, height: 0, top: 0, progress: 0 })
        return
      }
      const trackHeight = Math.max(0, viewport - TRACK_INSET * 2)
      const height = Math.min(trackHeight, Math.max(24, trackHeight * viewport / content))
      const maxTop = trackHeight - height
      const maxScroll = content - viewport
      const progress = maxScroll > 0 ? scroller.scrollTop / maxScroll : 0
      setThumb({ visible: true, height, top: TRACK_INSET + progress * maxTop, progress })
    }
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(scroller)
    const root = document.getElementById('root')
    if (root) resizeObserver.observe(root)
    scroller.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    update()
    return () => {
      resizeObserver.disconnect()
      scroller.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [desktop])

  if (!desktop || !thumb.visible) return null
  return createPortal(
    <div
      aria-hidden="true"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => { if (!dragging) setHovered(false) }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        const startY = event.clientY
        const startScroll = document.body.scrollTop
        const trackHeight = document.body.clientHeight - TRACK_INSET * 2
        const maxThumbTop = trackHeight - thumb.height
        const maxScroll = document.body.scrollHeight - document.body.clientHeight
        setDragging(true)
        const move = (moveEvent: PointerEvent) => {
          if (maxThumbTop > 0) document.body.scrollTop = startScroll + (moveEvent.clientY - startY) / maxThumbTop * maxScroll
        }
        const stop = () => {
          setDragging(false)
          setHovered(false)
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', stop)
          window.removeEventListener('pointercancel', stop)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', stop)
        window.addEventListener('pointercancel', stop)
      }}
      style={{
        position: 'fixed', top: thumb.top, right: 0, width: RIGHT_GUTTER, height: thumb.height,
        display: 'flex', justifyContent: 'center', cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none', zIndex: 10000,
      }}
    >
      <div style={{
        width: THUMB_WIDTH, height: '100%', borderRadius: THUMB_WIDTH / 2,
        backgroundColor: hovered || dragging ? 'var(--color-interactive-element-muted)' : 'var(--color-divider-low)',
        backgroundImage: 'none', opacity: 1, transition: 'background-color 120ms ease',
        maskImage: thumb.progress < 0.15
          ? `linear-gradient(to bottom, #000 0%, #000 ${70 + thumb.progress / 0.15 * 30}%, transparent 100%)`
          : thumb.progress > 0.85
            ? `linear-gradient(to bottom, transparent 0%, #000 ${(thumb.progress - 0.85) / 0.15 * 30}%, #000 100%)`
            : 'none',
        WebkitMaskImage: thumb.progress < 0.15
          ? `linear-gradient(to bottom, #000 0%, #000 ${70 + thumb.progress / 0.15 * 30}%, transparent 100%)`
          : thumb.progress > 0.85
            ? `linear-gradient(to bottom, transparent 0%, #000 ${(thumb.progress - 0.85) / 0.15 * 30}%, #000 100%)`
            : 'none',
        mixBlendMode: 'normal', filter: 'none', pointerEvents: 'none',
      }} />
    </div>,
    document.body,
  )
}
