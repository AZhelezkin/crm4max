/**
 * Открытие hosted-формы оплаты T-Bank с учётом возможностей контейнера.
 *
 * Почему так: openLink уводит во внешний браузер, а Max не шлёт
 * visibilitychange/focus ни при уходе, ни при возврате — приложение не узнаёт
 * о завершении оплаты (ловили тикером). При навигации в том же WebView форма
 * после оплаты сама возвращает пользователя по SuccessURL/FailURL с query
 * `payResult`; приложение преобразует его в #/pay-result и сразу показывает
 * результат. Авторизация переживает круг: JWT мастера в localStorage.
 *
 * Telegram сохраняем открытым и отправляем во внешний банковский checkout.
 *
 * NB: форма ПРИВЯЗКИ карты (AddCard) SuccessURL не
 * принимает — её по-прежнему открываем через openLink во внешнем браузере.
 */
export function openPaymentForm(url: string): void {
  if (miniAppProvider() === 'telegram') {
    openMiniAppLink(url)
    return
  }
  window.location.assign(url)
}

/** AddCard не поддерживает SuccessURL, поэтому сохраняем mini-app открытым под
 * внешней формой. После закрытия формы reconciliation обновит привязанную карту. */
export function openCardBindingForm(url: string): void {
  openMiniAppLink(url)
}
import { miniAppProvider, openMiniAppLink } from './miniAppHost'
