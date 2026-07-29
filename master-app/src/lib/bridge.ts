/**
 * Shim для @vkontakte/vk-bridge — проксирует вызовы в MAX WebApp API.
 * Позволяет не переписывать весь код при миграции с VK на Max.
 */
import { installTopOverscrollGuard } from './topOverscrollGuard'

declare global {
  interface Window {
    WebApp?: {
      ready: () => void
      initData: string
      initDataUnsafe: {
        user?: { id: number; first_name: string; last_name: string; username?: string }
        start_param?: string
      }
      requestContact: () => Promise<{ phone_number: string }>
      shareContent: (params: { text: string }) => void
      openLink: (url: string) => void
      openMaxLink: (url: string) => void
      openCodeReader: (fileSelect: boolean) => Promise<string | { data?: string; result?: string; text?: string }>
      downloadFile: (url: string, fileName: string) => void | Promise<void>
      /** Мост шлёт клиенту WebAppSetupSwipesBehavior { allowVerticalSwipes: false }. */
      disableVerticalSwipes?: () => Promise<{ allowVerticalSwipes: boolean }>
      enableVerticalSwipes?: () => Promise<{ allowVerticalSwipes: boolean }>
      /** Текущее состояние жеста (в старых клиентах Max может отсутствовать). */
      isVerticalSwipesEnabled?: boolean
      /** Диагностика клиента: 'android' | 'ios' | 'web' | …, версия моста, модель. */
      platform?: string | null
      version?: string | null
      deviceName?: string | null
    }
  }
}

/**
 * Блокировка нативного «свайпа вниз = закрыть приложение».
 *
 * Мини-приложение живёт в шторке Max, и вертикальный свайп по контенту (заметнее
 * всего в самом верху страницы, где тянуть уже нечего) нативно сворачивает/закрывает
 * его. CSS-уровня мало: `overscroll-behavior: none` на html/body (см. index.css)
 * гасит rubber-band внутри WebView, но сам жест перехватывает нативный контейнер.
 * Мост даёт для этого WebAppSetupSwipesBehavior — им и пользуемся.
 */
export type VerticalSwipesResult =
  | { ok: true; allowVerticalSwipes: boolean }
  | { ok: false; error: string }

/** Что вообще доступно в текущем окружении — для диагностики на тест-странице. */
export function verticalSwipesInfo(): {
  hasWebApp: boolean
  hasMethod: boolean
  enabled: boolean | undefined
  platform: string | null | undefined
  version: string | null | undefined
  deviceName: string | null | undefined
  /** Все ключи объекта WebApp — видно, что реально отдал клиент. */
  keys: string[]
} {
  const wa = window.WebApp
  let keys: string[] = []
  if (wa) {
    // Методы моста лежат на прототипе класса, поэтому одного Object.keys мало.
    const own = Object.keys(wa)
    const proto = Object.getPrototypeOf(wa) as object | null
    const inherited = proto ? Object.getOwnPropertyNames(proto) : []
    keys = [...new Set([...own, ...inherited])].filter((k) => k !== 'constructor').sort()
  }
  return {
    hasWebApp: !!wa,
    hasMethod: typeof wa?.disableVerticalSwipes === 'function',
    enabled: wa?.isVerticalSwipesEnabled,
    platform: wa?.platform,
    version: wa?.version,
    deviceName: wa?.deviceName,
    keys,
  }
}

/** Ошибку клиента разворачиваем целиком: у Max это объект { code, description }. */
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>
    const parts = [o.code, o.description, o.error, o.message].filter(Boolean)
    if (parts.length) return parts.join(' — ')
  }
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

/** Включить/выключить вертикальные свайпы. Ошибку не бросает — возвращает в результате. */
export async function setVerticalSwipes(allow: boolean): Promise<VerticalSwipesResult> {
  const wa = window.WebApp
  if (!wa) return { ok: false, error: 'window.WebApp отсутствует (открыто вне Max?)' }
  // Проверяем ровно тот метод, который нужен, — а не пару сразу.
  const method = allow ? wa.enableVerticalSwipes : wa.disableVerticalSwipes
  if (typeof method !== 'function') {
    return { ok: false, error: `${allow ? 'enable' : 'disable'}VerticalSwipes нет в window.WebApp (старая версия моста)` }
  }
  try {
    const res = await method.call(wa)
    return { ok: true, allowVerticalSwipes: res?.allowVerticalSwipes ?? allow }
  } catch (err) {
    // Клиент не ответил/не поддерживает — не фатально, просто остаётся штатный жест.
    return { ok: false, error: describeError(err) }
  }
}

export function openExternalLink(url: string): void {
  window.WebApp?.openLink?.(url)
}

/**
 * Ставит блокировку свайпов и восстанавливает её при возврате из фона
 * (клиент Max может сбросить поведение, пока приложение свёрнуто).
 * Возвращает функцию отписки — для useEffect.
 */
export function keepVerticalSwipesDisabled(): () => void {
  let removeGuard: (() => void) | null = null

  // Если клиент Max метод не поддержал — включаем тач-фолбэк.
  const request = () => setVerticalSwipes(false).then((res) => {
    if (!res.ok && !removeGuard) removeGuard = installTopOverscrollGuard()
    return res
  })

  void request()

  const onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return
    // Уже заблокировано — повторный запрос к клиенту не нужен.
    if (window.WebApp?.isVerticalSwipesEnabled === false) return
    void request()
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    removeGuard?.()
  }
}

const bridge = {
  send: async (method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> => {
    switch (method) {
      case 'VKWebAppInit':
        window.WebApp?.ready()
        return {}

      case 'VKWebAppGetAuthToken': {
        if (!window.WebApp) throw new Error('MAX WebApp unavailable')
        const user = window.WebApp.initDataUnsafe?.user
        return {
          access_token: window.WebApp.initData ?? '',
          user_id: user?.id ?? 0,
        }
      }

      case 'VKWebAppAddToCalendar':
        // MAX не поддерживает добавление в календарь — молча игнорируем
        return {}

      case 'VKWebAppOpenPayForm':
        // Оплата через VK Pay недоступна в Max — заглушка
        console.warn('VKWebAppOpenPayForm не поддерживается в Max')
        return {}

      case 'VKWebAppOpenApp':
        // Открытие другого VK-приложения — не актуально в Max
        return {}

      default:
        console.warn(`bridge.send: неизвестный метод "${method}"`, params)
        return {}
    }
  },
}

export default bridge
