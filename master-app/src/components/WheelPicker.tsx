import { text } from '@/styles/typography'
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

export interface WheelPickerOption {
  value: string
  label: string
  tone?: 'default' | 'warning' | 'muted'
}

// Типовой picker проекта (Figma 9762:65897): bottom-sheet с iOS-колесом + кнопка «Выбрать».
// Один столбец: центральный ряд крупный (23) и яркий, соседние мельче/тусклее по расстоянию.
// Скролл со scroll-snap; «Выбрать» фиксирует центрированное значение, тап по фону — отмена,
// тап по ряду — плавно подкручивает его в центр.
const ROW_H = 30                                  // шаг центров рядов (макет ≈30, колесо 212/7)
const VISIBLE = 7                                 // 3 сверху + центр + 3 снизу
const PAD = (VISIBLE * ROW_H - ROW_H) / 2         // 90 — крайние ряды центрируются

export default function WheelPicker({ open, value, options, onSelect, onClose }: {
  open: boolean
  value: string
  options: WheelPickerOption[]
  /** Вызывается по «Выбрать» с центрированным значением. */
  onSelect: (value: string) => void
  onClose: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const startIdx = Math.max(0, options.findIndex((o) => o.value === value))
  const [centerIdx, setCenterIdx] = useState(startIdx)

  // Центрируем текущее значение при открытии (без анимации).
  useLayoutEffect(() => {
    if (!open) return
    setCenterIdx(startIdx)
    const el = scrollRef.current
    if (el) el.scrollTop = startIdx * ROW_H
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const idx = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ROW_H)))
    if (idx !== centerIdx) setCenterIdx(idx)
  }

  const confirm = () => { onSelect(options[centerIdx]?.value ?? value); onClose() }

  // Размер/тусклость ряда по расстоянию от центра (макет: 23/18/14/12).
  const rowStyle = (dist: number, tone: WheelPickerOption['tone']): CSSProperties => ({
    height: ROW_H,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    scrollSnapAlign: 'center',
    fontSize: dist === 0 ? 23 : dist === 1 ? 18 : dist === 2 ? 14 : 12,
    lineHeight: 1,
    fontWeight: dist === 0 ? 600 : 400,
    color: tone === 'warning'
      ? 'var(--color-warning-surface-accented)'
      : tone === 'muted'
        ? 'var(--color-on-surface-muted)'
        : 'var(--color-on-surface)',
    opacity: dist === 0 ? 1 : dist === 1 ? 0.85 : dist === 2 ? 0.72 : 0.6,
    whiteSpace: 'nowrap',
    padding: '0 24px',
    cursor: 'pointer',
    transition: 'font-size 0.12s, opacity 0.12s',
  })

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-background)',
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          paddingBottom: 'calc(48px + env(safe-area-inset-bottom))',
        }}
      >
        {/* iOS-колесо: h 210 (7×30), полоса выбора по центру (две тонкие линии). */}
        <div style={{ position: 'relative', height: VISIBLE * ROW_H, width: '100%' }}>
          <div style={{
            position: 'absolute', left: 20, right: 20,
            top: '50%', height: ROW_H, transform: 'translateY(-50%)',
            borderTop: '1px solid var(--color-divider-low)',
            borderBottom: '1px solid var(--color-divider-low)',
            pointerEvents: 'none',
          }} />
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{
              height: '100%', overflowY: 'auto',
              scrollSnapType: 'y mandatory',
              padding: `${PAD}px 0`,
              boxSizing: 'border-box',
              scrollbarWidth: 'none',
            }}
          >
            {options.map((o, i) => (
              <div
                key={o.value}
                onClick={() => scrollRef.current?.scrollTo({ top: i * ROW_H, behavior: 'smooth' })}
                style={rowStyle(Math.abs(i - centerIdx), o.tone)}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>

        {/* Кнопка «Выбрать» — primary h60 rx20 (макет 9762:65900). */}
        <div style={{ width: '100%', padding: '0 12px', boxSizing: 'border-box' }}>
          <button
            type="button"
            onClick={confirm}
            style={{
              width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...text.callout1, cursor: 'pointer',
              background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)',
            }}
          >
            Выбрать
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
