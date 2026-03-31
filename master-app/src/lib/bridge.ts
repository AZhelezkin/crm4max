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
    }
  }
}

const bridge = {
  send: async (method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> => {
    switch (method) {
      case 'VKWebAppInit':
        window.WebApp?.ready()
        return {}

      case 'VKWebAppGetAuthToken': {
        const user = window.WebApp?.initDataUnsafe?.user
        return {
          access_token: window.WebApp?.initData ?? '',
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
