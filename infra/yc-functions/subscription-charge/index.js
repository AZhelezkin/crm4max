// YC Cloud Function — вызывается timer-триггером (cron) раз в сутки и дёргает
// движок списания подписок на бэкенде: POST на защищённый x-cron-secret эндпоинт.
// Runtime nodejs18+ — глобальный fetch доступен, внешних зависимостей нет.
exports.handler = async () => {
  const url = `${process.env.API_URL}/api/subscription/charge-due`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-cron-secret': process.env.CRON_SECRET },
  })
  const body = await res.text()
  console.log(`charge-due → ${res.status}: ${body}`)
  return { statusCode: res.status, body }
}
