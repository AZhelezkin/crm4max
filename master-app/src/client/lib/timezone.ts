import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const DEFAULT_TZ = 'Europe/Moscow'

/** IANA-пояс устройства клиента (напр. "Asia/Vladivostok"); дефолт, если недоступно. */
export function deviceTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ
  } catch {
    return DEFAULT_TZ
  }
}

/**
 * Перевод «стеночасов» записи (хранятся в поясе мастера) в локальное время клиента
 * (пояс устройства). Возвращает { date, time } — с возможным сдвигом даты на стыке
 * суток. Если пояса совпадают/невалидны — исходные значения.
 */
export function toClientLocal(date: string, time: string, masterTz: string | null | undefined): { date: string; time: string } {
  const from = masterTz || DEFAULT_TZ
  const to = deviceTz()
  if (from === to) return { date, time }
  const inst = dayjs.tz(`${date}T${time}`, from)
  if (!inst.isValid()) return { date, time }
  const c = inst.tz(to)
  return { date: c.format('YYYY-MM-DD'), time: c.format('HH:mm') }
}

/** Обратное к toClientLocal: «стеночасы» клиента (пояс устройства) → пояс мастера.
 *  Нужно для записи: на сервер уходят master-дата/время. */
export function toMasterLocal(date: string, time: string, masterTz: string | null | undefined): { date: string; time: string } {
  const to = masterTz || DEFAULT_TZ
  const from = deviceTz()
  if (from === to) return { date, time }
  const inst = dayjs.tz(`${date}T${time}`, from)
  if (!inst.isValid()) return { date, time }
  const m = inst.tz(to)
  return { date: m.format('YYYY-MM-DD'), time: m.format('HH:mm') }
}
