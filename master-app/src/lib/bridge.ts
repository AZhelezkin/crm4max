/**
 * Shim для @vkontakte/vk-bridge — проксирует вызовы в MAX WebApp API.
 * Позволяет не переписывать весь код при миграции с VK на Max.
 */

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
export function verticalSwipesInfo(): { hasWebApp: boolean; hasMethod: boolean; enabled: boolean | undefined } {
  const wa = window.WebApp
  return {
    hasWebApp: !!wa,
    hasMethod: typeof wa?.disableVerticalSwipes === 'function',
    enabled: wa?.isVerticalSwipesEnabled,
  }
}

/** Включить/выключить вертикальные свайпы. Ошибку не бросает — возвращает в результате. */
export async function setVerticalSwipes(allow: boolean): Promise<VerticalSwipesResult> {
  const wa = window.WebApp
  // Нет метода — старый клиент Max или обычный браузер: молча живём как раньше.
  if (!wa?.disableVerticalSwipes || !wa?.enableVerticalSwipes) {
    return { ok: false, error: 'Метод недоступен (нет window.WebApp или старый клиент Max)' }
  }
  try {
    const res = allow ? await wa.enableVerticalSwipes() : await wa.disableVerticalSwipes()
    return { ok: true, allowVerticalSwipes: res?.allowVerticalSwipes ?? allow }
  } catch (err) {
    // Клиент не ответил/не поддерживает — не фатально, просто остаётся штатный жест.
    return { ok: false, error: err instanceof Error ? err.message : JSON.stringify(err) }
  }
}

/**
 * Ставит блокировку свайпов и восстанавливает её при возврате из фона
 * (клиент Max может сбросить поведение, пока приложение свёрнуто).
 * Возвращает функцию отписки — для useEffect.
 */
export function keepVerticalSwipesDisabled(): () => void {
  void setVerticalSwipes(false)

  const onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return
    // Уже заблокировано — повторный запрос к клиенту не нужен.
    if (window.WebApp?.isVerticalSwipesEnabled === false) return
    void setVerticalSwipes(false)
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  return () => document.removeEventListener('visibilitychange', onVisibilityChange)
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
