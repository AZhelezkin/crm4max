import { createPortal } from 'react-dom'

import { Radio44 } from '@/components/ConsentsStep'
import { text } from '@/styles/typography'

import type { SeriesActionScope } from './types'

export type SeriesScopeAction = 'edit' | 'reschedule' | 'cancel'

interface SeriesScopeDialogProps {
  action: SeriesScopeAction
  onSelect: (scope: SeriesActionScope) => void
  onClose: () => void
}

const SCOPE_OPTIONS: { scope: SeriesActionScope; label: string; description: Record<SeriesScopeAction, string> }[] = [
  {
    scope: 'SINGLE',
    label: 'Только эта запись',
    description: {
      edit: 'Изменения не затронут остальные записи серии',
      reschedule: 'Перенос не изменит расписание серии',
      cancel: 'Остальные записи серии сохранятся',
    },
  },
  {
    scope: 'THIS_AND_FUTURE',
    label: 'Эта и следующие',
    description: {
      edit: 'Новое правило начнёт действовать с этой записи',
      reschedule: 'Расписание изменится с этой записи',
      cancel: 'Эта и все следующие записи будут отменены',
    },
  },
  {
    scope: 'ALL',
    label: 'Вся серия',
    description: {
      edit: 'Изменятся все будущие записи; история сохранится',
      reschedule: 'Изменятся все будущие записи; история сохранится',
      cancel: 'Все будущие записи серии будут отменены',
    },
  },
]

export default function SeriesScopeDialog({ action, onSelect, onClose }: SeriesScopeDialogProps) {
  const title = action === 'cancel'
    ? 'Что отменить?'
    : action === 'reschedule'
      ? 'Что перенести?'
      : 'Что изменить?'

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="series-scope-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 329,
          boxSizing: 'border-box',
          background: 'var(--color-surface)',
          borderRadius: 24,
          padding: '20px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div id="series-scope-title" style={{ padding: '0 8px 8px', ...text.h4, color: 'var(--color-on-surface)' }}>
          {title}
        </div>
        <div role="radiogroup" aria-label={title} style={{ display: 'flex', flexDirection: 'column' }}>
          {SCOPE_OPTIONS.map((option, index) => (
            <button
              key={option.scope}
              type="button"
              role="radio"
              aria-checked="false"
              onClick={() => onSelect(option.scope)}
              style={{
                width: '100%',
                border: 'none',
                borderBottom: index === SCOPE_OPTIONS.length - 1 ? 'none' : '1px solid var(--color-divider-low)',
                background: 'none',
                padding: '8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Radio44 checked={false} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{option.label}</span>
                <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{option.description[action]}</span>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 22,
            border: 'none',
            marginTop: 16,
            cursor: 'pointer',
            background: 'var(--color-background)',
            ...text.callout1,
            color: 'var(--color-on-surface)',
          }}
        >
          Назад
        </button>
      </div>
    </div>,
    document.body,
  )
}
