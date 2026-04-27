/**
 * Типографические токены MAX UI.
 *
 * Используются как inline-стили: `style={{ ...text.title, color: 'var(--color-on-surface)' }}`.
 * Цвет НЕ задаётся в типографических токенах — только размер/жирность/lineHeight,
 * чтобы один и тот же стиль текста работал и на тёмном, и на светлом фоне.
 *
 * При добавлении нового размера обновить и этот файл, и таблицу в CLAUDE.md.
 */

import type { CSSProperties } from 'react'

type TextStyle = Pick<CSSProperties, 'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing' | 'textTransform'>

export const text = {
  /** 32 / 38 / 700 — крупные заголовки экрана (Welcome, Onboarding). */
  display: {
    fontSize: 32, lineHeight: '38px', fontWeight: 700,
  },

  /** 24 / 30 / 700 — заголовок страницы / большая кнопка (Профиль, Бронь, Платежи). */
  title: {
    fontSize: 24, lineHeight: '30px', fontWeight: 700,
  },

  /** 20 / 26 / 700 — заголовок раздела внутри страницы. */
  titleSmall: {
    fontSize: 20, lineHeight: '26px', fontWeight: 700,
  },

  /** 18 / 24 / 600 — заголовок карточки, секции. */
  headline: {
    fontSize: 18, lineHeight: '24px', fontWeight: 600,
  },

  /** 16 / 22 / 600 — подзаголовок, активный пункт списка, ярлык поля. */
  subhead: {
    fontSize: 16, lineHeight: '22px', fontWeight: 600,
  },

  /** 15 / 20 / 400 — основной текст. */
  body: {
    fontSize: 15, lineHeight: '20px', fontWeight: 400,
  },

  /** 15 / 20 / 600 — основной текст в выделенной форме (имя клиента, цена). */
  bodyStrong: {
    fontSize: 15, lineHeight: '20px', fontWeight: 600,
  },

  /** 14 / 18 / 500 — текст кнопок, чипов, табов, второстепенных меток. */
  action: {
    fontSize: 14, lineHeight: '18px', fontWeight: 500,
  },

  /** 13 / 18 / 400 — пояснения, подписи под полями, мета-информация. */
  footnote: {
    fontSize: 13, lineHeight: '18px', fontWeight: 400,
  },

  /** 12 / 16 / 500 — caption, бейджи. */
  caption: {
    fontSize: 12, lineHeight: '16px', fontWeight: 500,
  },

  /** 11 / 14 / 600, UPPERCASE + letter-spacing — лейблы секций, статус-бейджи. */
  overline: {
    fontSize: 11, lineHeight: '14px', fontWeight: 600,
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>

export type TextStyleKey = keyof typeof text
