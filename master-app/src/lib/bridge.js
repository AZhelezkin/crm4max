/**
 * Shim для @vkontakte/vk-bridge — проксирует вызовы в MAX WebApp API.
 * Позволяет не переписывать весь код при миграции с VK на Max.
 */
const bridge = {
    send: async (method, params) => {
        switch (method) {
            case 'VKWebAppInit':
                window.WebApp?.ready();
                return {};
            case 'VKWebAppGetAuthToken': {
                if (!window.WebApp)
                    throw new Error('MAX WebApp unavailable');
                const user = window.WebApp.initDataUnsafe?.user;
                return {
                    access_token: window.WebApp.initData ?? '',
                    user_id: user?.id ?? 0,
                };
            }
            case 'VKWebAppAddToCalendar':
                // MAX не поддерживает добавление в календарь — молча игнорируем
                return {};
            case 'VKWebAppOpenPayForm':
                // Оплата через VK Pay недоступна в Max — заглушка
                console.warn('VKWebAppOpenPayForm не поддерживается в Max');
                return {};
            case 'VKWebAppOpenApp':
                // Открытие другого VK-приложения — не актуально в Max
                return {};
            default:
                console.warn(`bridge.send: неизвестный метод "${method}"`, params);
                return {};
        }
    },
};
export default bridge;
