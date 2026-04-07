import dayjs from 'dayjs'
import { prisma } from '../../db/client'

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

  async getAvailableSlots(masterId: string, date: string, serviceId: string) {
    const schedule = await prisma.schedule.findUnique({ where: { masterId } })
    if (!schedule) return []

    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) return []

    // Проверяем рабочий день (dayjs: 0=Вс, 1=Пн ... 6=Сб → конвертим в 1=Пн...7=Вс)
    const dayOfWeek = dayjs(date).day() || 7
    if (!schedule.workingDays.includes(dayOfWeek)) return []

    // Генерируем все слоты с шагом = длительность + буфер
    const step = service.duration + schedule.bufferMinutes
    const slots: string[] = []

    let current = dayjs(`${date} ${schedule.startTime}`)
    const end = dayjs(`${date} ${schedule.endTime}`)
    const breakStart = schedule.breakStart ? dayjs(`${date} ${schedule.breakStart}`) : null
    const breakEnd = schedule.breakEnd ? dayjs(`${date} ${schedule.breakEnd}`) : null

    while (current.add(service.duration, 'minute').isBefore(end) ||
           current.add(service.duration, 'minute').isSame(end)) {
      // Пропускаем перерыв
      if (breakStart && breakEnd) {
        if (current.isBefore(breakEnd) && current.add(service.duration, 'minute').isAfter(breakStart)) {
          current = breakEnd
          continue
        }
      }
      slots.push(current.format('HH:mm'))
      current = current.add(step, 'minute')
    }

    // Исключаем уже занятые слоты
    const existingBookings = await prisma.booking.findMany({
      where: {
        masterId,
        date,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { service: true },
    })

    // Проверяем пересечение по времени с учётом длительности каждой услуги
    return slots.filter((slot) => {
      const slotStart = dayjs(`${date} ${slot}`)
      const slotEnd = slotStart.add(service.duration, 'minute')
      return !existingBookings.some((b) => {
        const bStart = dayjs(`${date} ${b.time}`)
        const bEnd = bStart.add(b.service.duration, 'minute')
        // Пересечение: slotStart < bEnd && slotEnd > bStart
        return slotStart.isBefore(bEnd) && slotEnd.isAfter(bStart)
      })
    })
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

    const step = service.duration + schedule.bufferMinutes
    const breakStartTime = schedule.breakStart
    const breakEndTime = schedule.breakEnd
    const result: Record<string, boolean> = {}

    let d = dayjs(from)
    const last = dayjs(to)

    while (!d.isAfter(last)) {
      const dateStr = d.format('YYYY-MM-DD')
      const dayOfWeek = d.day() || 7

      if (!schedule.workingDays.includes(dayOfWeek)) {
        // Нерабочие дни НЕ включаем в ответ — фронт отличит их от "занятых"
        d = d.add(1, 'day')
        continue
      }

      // Генерируем слоты для этого дня
      let current = dayjs(`${dateStr} ${schedule.startTime}`)
      const end = dayjs(`${dateStr} ${schedule.endTime}`)
      const brkStart = breakStartTime ? dayjs(`${dateStr} ${breakStartTime}`) : null
      const brkEnd = breakEndTime ? dayjs(`${dateStr} ${breakEndTime}`) : null

      const dayBookings = existingBookings.filter((b) => b.date === dateStr)
      let hasSlot = false

      while (current.add(service.duration, 'minute').isBefore(end) ||
             current.add(service.duration, 'minute').isSame(end)) {
        if (brkStart && brkEnd) {
          if (current.isBefore(brkEnd) && current.add(service.duration, 'minute').isAfter(brkStart)) {
            current = brkEnd
            continue
          }
        }

        const slotStart = current
        const slotEnd = slotStart.add(service.duration, 'minute')
        const isBooked = dayBookings.some((b) => {
          const bStart = dayjs(`${dateStr} ${b.time}`)
          const bEnd = bStart.add(b.service.duration, 'minute')
          return slotStart.isBefore(bEnd) && slotEnd.isAfter(bStart)
        })

        if (!isBooked) {
          hasSlot = true
          break
        }
        current = current.add(step, 'minute')
      }

      result[dateStr] = hasSlot
      d = d.add(1, 'day')
    }

    return result
  },
}
