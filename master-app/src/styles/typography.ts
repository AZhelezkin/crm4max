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
  /** 32 / 38 / 700 — крупные заголовки экрана (Welcome, Onboarding, Deposit). */
  display:        { fontSize: 32, lineHeight: '38px', fontWeight: 700 },

  /** 28 / 36 / 800 letterSpacing -0.84px — Figma «H2», hero-имя в карточке мастера. */
  h2:             { fontSize: 28, lineHeight: '36px', fontWeight: 800, letterSpacing: -0.84 },

  /** 24 / 30 / 700 — заголовок страницы. */
  title:          { fontSize: 24, lineHeight: '30px', fontWeight: 700 },

  /** 20 / 26 / 700 — заголовок раздела внутри страницы / портала. Покрывает также fontSize 22. */
  titleSmall:     { fontSize: 20, lineHeight: '26px', fontWeight: 700 },

  /** 18 / 24 / 600 — заголовок карточки. */
  headline:       { fontSize: 18, lineHeight: '24px', fontWeight: 600 },

  /** 17 / 22 / 600 — крупная подпись (subheadline в iOS-смысле). */
  subheadline:    { fontSize: 17, lineHeight: '22px', fontWeight: 600 },

  /** 17 / 22 / 400 — крупный обычный текст (callout в iOS-смысле). */
  callout:        { fontSize: 17, lineHeight: '22px', fontWeight: 400 },

  /** 17 / 24 / 700 letterSpacing -0.17px — Figma «Callout 1», заголовок в карточке-листе (служба, мастер). */
  callout1:       { fontSize: 17, lineHeight: '24px', fontWeight: 700, letterSpacing: -0.17 },

  /** 17 / 24 / 400 letterSpacing -0.17px — Figma «Body 2», крупный обычный (табы, заметные подписи). */
  body2:          { fontSize: 17, lineHeight: '24px', fontWeight: 400, letterSpacing: -0.17 },

  /** 16 / 22 / 600 — подзаголовок, активный пункт списка, ярлык поля. */
  subhead:        { fontSize: 16, lineHeight: '22px', fontWeight: 600 },

  /** 16 / 22 / 400 — обычный текст крупнее body (для контента, длинных описаний). */
  subheadRegular: { fontSize: 16, lineHeight: '22px', fontWeight: 400 },

  /** 15 / 20 / 400 — основной текст. */
  body:           { fontSize: 15, lineHeight: '20px', fontWeight: 400 },

  /** 15 / 20 / 500 — основной текст medium (имена, лейблы кнопок). */
  bodyMedium:     { fontSize: 15, lineHeight: '20px', fontWeight: 500 },

  /** 15 / 20 / 600 — выделенный основной текст (имя клиента, цена). */
  bodyStrong:     { fontSize: 15, lineHeight: '20px', fontWeight: 600 },

  /** 14 / 18 / 500 — текст кнопок, чипов, табов, второстепенных меток. */
  action:         { fontSize: 14, lineHeight: '18px', fontWeight: 500 },

  /** 14 / 16 / 500 letterSpacing -0.028px — Figma «Caption 2», компактный второстепенный (chip-label, описания, счётчики). */
  caption2:       { fontSize: 14, lineHeight: '16px', fontWeight: 500, letterSpacing: -0.028 },

  /** 13 / 18 / 400 — пояснения, подписи под полями, мета-информация. */
  footnote:       { fontSize: 13, lineHeight: '18px', fontWeight: 400 },

  /** 13 / 18 / 600 — выделенная подпись (имя в карточке отзыва, статус). */
  footnoteStrong: { fontSize: 13, lineHeight: '18px', fontWeight: 600 },

  /** 12 / 16 / 500 — caption, бейджи. */
  caption:        { fontSize: 12, lineHeight: '16px', fontWeight: 500 },

  /** 11 / 14 / 500 — мелкий caption. */
  captionSmall:   { fontSize: 11, lineHeight: '14px', fontWeight: 500 },

  /** 11 / 14 / 600 UPPERCASE + letter-spacing — лейблы секций, статус-бейджи. */
  overline:       {
    fontSize: 11, lineHeight: '14px', fontWeight: 600,
    letterSpacing: 0.4, textTransform: 'uppercase',
  },

  /** 10 / 14 / 800 UPPERCASE letterSpacing -0.2px — Figma «label 3 CAPS», узкий статус-бейдж (% СКИДКИ). */
  label3Caps:     {
    fontSize: 10, lineHeight: '14px', fontWeight: 800,
    letterSpacing: -0.2, textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>

export type TextStyleKey = keyof typeof text
