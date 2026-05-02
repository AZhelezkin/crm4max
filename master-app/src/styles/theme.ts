/**
 * Семантические темы crm4max — Dark и Light.
 *
 * Имена и значения соответствуют семантическому слою MAX UI из Figma:
 * src/styles/Dark.tokens.json и src/styles/Light.tokens.json (источник истины).
 * Базовая палитра: src/styles/tokens.json → tokens.ts.
 *
 * При изменении любого токена — править оба JSON, оба объекта ниже,
 * и CSS-переменные в src/index.css синхронно.
 */

type SemanticTheme = {
  surface: string
  surfaceTransparent: string
  background: string
  onSurface: string
  onSurfaceInverted: string
  onSurfaceSoften: string
  onSurfaceSecondary: string
  onSurfaceMuted: string
  primarySurface: string
  onPrimarySurface: string
  secondarySurface: string
  secondarySurfaceMuted: string
  patternElement: string
  onSecondarySurface: string
  errorSurfaceLite: string
  errorElementMuted: string
  onErrorSurfaceLite: string
  errorSurfaceAccented: string
  onErrorSurfaceAccented: string
  successSurfaceLite: string
  onSuccessSurfaceLite: string
  successSurfaceAccented: string
  warningSurfaceLite: string
  onWarningSurfaceLite: string
  warningSurfaceAccented: string
  onWarningSurfaceAccented: string
  interactiveElementAccented: string
  interactiveElement: string
  interactiveElementSecondary: string
  interactiveElementMuted: string
  activeElement: string
  activeSurface: string
  dividerLow: string
  dividerMid: string
  gradViolet0: string
  gradViolet100: string
  gradMint0: string
  gradMint100: string
  gradPeach0: string
  gradPeach100: string
  gradGreen0: string
  gradGreen100: string
  gradGreenVibrance0: string
  gradGreenVibrance100: string
  animationV1: string
  animationV2: string
  animationV3: string
  animationV4: string
  chatBgElements: string
  stackModalBackground: string
  serviceText: string
  serviceSurface: string
  backgroundBlur: string
}

export const darkTheme: SemanticTheme = {
  // Поверхности
  surface:               '#262729',                       // black90
  surfaceTransparent:    'rgba(242, 243, 245, 0.10)',
  background:            '#17181C',                       // MAX UI --background-surface-primary (синхронизировано с Max chrome)

  // Текст / иконки на основной поверхности
  onSurface:             '#FFFFFF',                       // black00
  onSurfaceInverted:     '#0E0F11',                       // black100
  onSurfaceSoften:       '#CECFD1',                       // black20
  onSurfaceSecondary:    '#B6B7B9',                       // black30
  onSurfaceMuted:        '#6E6F71',                       // black60

  // Primary
  primarySurface:        '#409BFE',                       // blue35
  onPrimarySurface:      '#FFFFFF',                       // black00

  // Secondary
  secondarySurface:      '#3C3F4D',                       // calmindigo80
  secondarySurfaceMuted: '#1E1F26',                       // calmindigo95
  patternElement:        '#24262E',                       // calmindigo90
  onSecondarySurface:    '#FFFFFF',                       // black00

  // Error
  errorSurfaceLite:        '#67212C',                     // red80
  errorElementMuted:       '#9B3143',                     // red65
  onErrorSurfaceLite:      '#E7A0AC',                     // red20
  errorSurfaceAccented:    '#DA7182',                     // red35
  onErrorSurfaceAccented:  '#FFFFFF',                     // black00

  // Success
  successSurfaceLite:      '#146321',                     // green80
  onSuccessSurfaceLite:    '#94E2A1',                     // green20
  successSurfaceAccented:  '#5ED472',                     // green35

  // Warning
  warningSurfaceLite:        '#785816',                   // orange80
  onWarningSurfaceLite:      '#F7D796',                   // orange20
  warningSurfaceAccented:    '#F0AF2D',                   // orange50
  onWarningSurfaceAccented:  '#FFFFFF',                   // black00

  // Интерактивные элементы
  interactiveElementAccented:  '#F2F2F5',                 // calmindigo04
  interactiveElement:          '#BCBECC',                 // calmindigo20
  interactiveElementSecondary: '#9A9EB3',                 // calmindigo35
  interactiveElementMuted:     '#5B5E73',                 // calmindigo65

  // Активные состояния
  activeElement:  '#409BFE',                              // blue35
  activeSurface:  '#003D7F',                              // blue80

  // Разделители
  dividerLow:     '#3E3F41',                              // black80
  dividerMid:     '#565759',                              // black70

  // Градиенты
  gradViolet0:          '#5F68E2',                        // violetbright1
  gradViolet100:        '#844BB6',                        // violetbright2
  gradMint0:            '#5295B4',                        // mintbright1
  gradMint100:          '#449395',                        // mintbright2
  gradPeach0:           '#C15781',                        // peachbright1
  gradPeach100:         '#DA6461',                        // peachbright2
  gradGreen0:           '#15482F',                        // greendim1
  gradGreen100:         '#195838',                        // greendim2
  gradGreenVibrance0:   '#3C8F7F',                        // greenvibrance1
  gradGreenVibrance100: '#008725',                        // greenvibrance2

  // Анимация (заглушки/декор)
  animationV1: '#622D8F',
  animationV2: '#42129A',
  animationV3: '#2E4E98',
  animationV4: '#2A2F99',

  // Прочее
  chatBgElements:       '#202336',                        // indigo90
  stackModalBackground: '#000000',                        // deepblack100
  serviceText:          'rgba(255, 255, 255, 0.60)',
  serviceSurface:       'rgba(14, 15, 17, 0.60)',
  backgroundBlur:       'rgba(0, 0, 0, 0.10)',
}

export const lightTheme: SemanticTheme = {
  surface:               '#FFFFFF',
  surfaceTransparent:    'rgba(255, 255, 255, 0.60)',
  background:            '#F2F3F5',

  onSurface:             '#0E0F11',
  onSurfaceInverted:     '#FFFFFF',
  onSurfaceSoften:       '#3E3F41',
  onSurfaceSecondary:    '#565759',
  onSurfaceMuted:        '#9E9FA1',

  primarySurface:        '#007AFE',
  onPrimarySurface:      '#FFFFFF',

  secondarySurface:      '#D7D8E0',
  secondarySurfaceMuted: '#E4E5EB',
  patternElement:        '#E4E5EB',
  onSecondarySurface:    '#0E0F11',

  errorSurfaceLite:        '#F3D0D5',
  errorElementMuted:       '#E7A0AC',
  onErrorSurfaceLite:      '#9B3143',
  errorSurfaceAccented:    '#CE4259',
  onErrorSurfaceAccented:  '#FFFFFF',

  successSurfaceLite:      '#C9F1D0',
  onSuccessSurfaceLite:    '#1F9432',
  successSurfaceAccented:  '#29C643',

  warningSurfaceLite:        '#FBEBCA',
  onWarningSurfaceLite:      '#B48322',
  warningSurfaceAccented:    '#F0AF2D',
  onWarningSurfaceAccented:  '#FFFFFF',

  interactiveElementAccented:  '#3C3F4D',
  interactiveElement:          '#5B5E73',
  interactiveElementSecondary: '#797D99',
  interactiveElementMuted:     '#9A9EB3',

  activeElement:  '#007AFE',
  activeSurface:  '#BFDEFF',

  dividerLow:     '#CECFD1',
  dividerMid:     '#B6B7B9',

  gradViolet0:          '#E1E2FA',
  gradViolet100:        '#E6DBF0',
  gradMint0:            '#E2EDF3',
  gradMint100:          '#DCEEEF',
  gradPeach0:           '#F7E9EE',
  gradPeach100:         '#F7DFDE',
  gradGreen0:           '#E7F8F0',
  gradGreen100:         '#DFF6EA',
  gradGreenVibrance0:   '#32D9B9',
  gradGreenVibrance100: '#09CA3E',

  animationV1: '#C7A6E3',
  animationV2: '#AD88F1',
  animationV3: '#ADBEE6',
  animationV4: '#A7AAE7',

  chatBgElements:       '#E1E3F0',
  stackModalBackground: '#000000',
  serviceText:          'rgba(14, 15, 17, 0.60)',
  serviceSurface:       'rgba(14, 15, 17, 0.60)',
  backgroundBlur:       'rgba(242, 243, 245, 0.10)',
}

export type ThemeKey = keyof SemanticTheme
export type Theme = SemanticTheme

/**
 * Текущая тема — Dark по умолчанию. Совпадает со значениями CSS-переменных в :root.
 * Используется только там, где var() недоступен (canvas API, библиотеки рендера).
 */
export const theme: SemanticTheme = darkTheme
