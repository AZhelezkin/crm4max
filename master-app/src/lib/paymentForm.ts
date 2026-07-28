/**
 * Открытие hosted-формы ОПЛАТЫ T-Bank в ТОМ ЖЕ WebView мини-аппа (а не во
 * внешнем браузере через WebApp.openLink).
 *
 * Почему так: openLink уводит во внешний браузер, а Max не шлёт
 * visibilitychange/focus ни при уходе, ни при возврате — приложение не узнаёт
 * о завершении оплаты (ловили тикером). При навигации в том же WebView форма
 * после оплаты сама возвращает пользователя по SuccessURL/FailURL с query
 * `payResult`; приложение преобразует его в #/pay-result и сразу показывает
 * результат. Авторизация переживает круг: JWT мастера в localStorage.
 *
 * NB: только для оплаты (Init). Форма ПРИВЯЗКИ карты (AddCard) SuccessURL не
 * принимает — её по-прежнему открываем через openLink во внешнем браузере.
 */
export function openPaymentForm(url: string): void {
  window.location.assign(url)
}
