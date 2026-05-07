import dayjs from 'dayjs'
import { prisma } from '../../db/client'

/** HH:mm → минуты от полуночи */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Минуты от полуночи → HH:mm */
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

type Interval = { start: number; end: number }

/**
 * «Сейчас» в часовом поясе мастера (MSK = UTC+3, без DST).
 * Сервер в UTC; для расчёта «сегодня» сдвигаем момент на +3ч.
 */
function nowInMasterTz() {
  const now = dayjs().add(3, 'hour')
  return {
    date: now.format('YYYY-MM-DD'),
    minutes: now.hour() * 60 + now.minute(),
  }
}

/** Рабочие окна из расписания, разбитые перерывом */
function buildWorkWindows(
  startTime: string, endTime: string,
  breakStart?: string | null, breakEnd?: string | null,
): Interval[] {
  const dayStart = toMinutes(startTime)
  const dayEnd = toMinutes(endTime)

  if (breakStart && breakEnd) {
    const brkStart = toMinutes(breakStart)
    const brkEnd = toMinutes(breakEnd)
    const windows: Interval[] = []
    if (dayStart < brkStart) windows.push({ start: dayStart, end: brkStart })
    if (brkEnd < dayEnd) windows.push({ start: brkEnd, end: dayEnd })
    return windows
  }

  return [{ start: dayStart, end: dayEnd }]
}

export const scheduleService = {
  get: (masterId: string) =>
    prisma.schedule.findUnique({ where: { masterId } }),

  upsert: (masterId: string, data: {
    workingDays: number[]
    startTime: string
    endTime: string
    breakStart?: string
    breakEnd?: string
    bufferMinutes: number
  }) =>
    prisma.schedule.upsert({
      where: { masterId },
      update: data,
      create: { masterId, ...data },
    }),

  /**
   * Динамический расчёт слотов: мелкий шаг + проверка буфера между услугами.
   * Слоты прижимаются к краям свободных окон → максимальная загрузка мастера.
   */
  async getAvailableSlots(masterId: string, date: string, serviceId: string) {
    const schedule = await prisma.schedule.findUnique({ where: { masterId } })
    if (!schedule) return []

    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) return []

    const tzNow = nowInMasterTz()
    if (date < tzNow.date) return []   // прошедшая дата

    // Проверяем рабочий день (dayjs: 0=Вс, 1=Пн ... 6=Сб → конвертим в 1=Пн...7=Вс)
    const dayOfWeek = dayjs(date).day() || 7
    if (!schedule.workingDays.includes(dayOfWeek)) return []

    const buffer = schedule.bufferMinutes
    const duration = service.duration
    // Шаг сетки слотов = duration + buffer: между двумя соседними записями
    // обязан быть зазор bufferMinutes. На пустом дне 09:00–13:00 при d=60, b=10
    // получаем 09:00, 10:10, 11:20 (11:20+60=12:20; следующий 12:30+60>13:00).
    const step = duration + buffer

    const windows = buildWorkWindows(
      schedule.startTime, schedule.endTime,
      schedule.breakStart, schedule.breakEnd,
    )

    const existingBookings = await prisma.booking.findMany({
      where: {
        masterId,
        date,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { service: true },
    })

    // Занятые интервалы: [start, end] каждой записи
    const busy = existingBookings.map((b) => ({
      start: toMinutes(b.time),
      end: toMinutes(b.time) + b.service.duration,
    }))

    // Для сегодняшней даты — отрезаем слоты, которые уже стартовали
    const minSlotStart = (date === tzNow.date) ? tzNow.minutes : 0

    const slots: string[] = []
    for (const win of windows) {
      for (let t = win.start; t + duration <= win.end; t += step) {
        if (t < minSlotStart) continue
        const hasConflict = busy.some((b) =>
          t < b.end + buffer && t + duration > b.start - buffer
        )
        if (!hasConflict) {
          slots.push(formatTime(t))
        }
      }
    }

    return slots
  },

  /**
   * Batch: для диапазона дат возвращает { [date]: boolean } — есть ли хотя бы один свободный слот.
   */
  async getAvailability(masterId: string, from: string, to: string, serviceId: string) {
    const schedule = await prisma.schedule.findUnique({ where: { masterId } })
    if (!schedule) return {}

    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) return {}

    // Все бронирования в диапазоне одним запросом
    const existingBookings = await prisma.booking.findMany({
      where: {
        masterId,
        date: { gte: from, lte: to },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { service: true },
    })

    const buffer = schedule.bufferMinutes
    const duration = service.duration
    const step = duration + buffer

    const windows = buildWorkWindows(
      schedule.startTime, schedule.endTime,
      schedule.breakStart, schedule.breakEnd,
    )

    const result: Record<string, boolean> = {}
    const tzNow = nowInMasterTz()

    let d = dayjs(from)
    const last = dayjs(to)

    while (!d.isAfter(last)) {
      const dateStr = d.format('YYYY-MM-DD')
      const dayOfWeek = d.day() || 7

      if (dateStr < tzNow.date) {
        // Прошедшая дата — слотов нет
        d = d.add(1, 'day')
        continue
      }

      if (!schedule.workingDays.includes(dayOfWeek)) {
        d = d.add(1, 'day')
        continue
      }

      const dayBookings = existingBookings.filter((b) => b.date === dateStr)
      const busy = dayBookings.map((b) => ({
        start: toMinutes(b.time),
        end: toMinutes(b.time) + b.service.duration,
      }))

      // Для сегодняшней даты — отрезаем слоты, которые уже стартовали
      const minSlotStart = (dateStr === tzNow.date) ? tzNow.minutes : 0

      let hasSlot = false
      for (const win of windows) {
        for (let t = win.start; t + duration <= win.end; t += step) {
          if (t < minSlotStart) continue
          const hasConflict = busy.some((b) =>
            t < b.end + buffer && t + duration > b.start - buffer
          )
          if (!hasConflict) {
            hasSlot = true
            break
          }
        }
        if (hasSlot) break
      }

      result[dateStr] = hasSlot
      d = d.add(1, 'day')
    }

    return result
  },
}
