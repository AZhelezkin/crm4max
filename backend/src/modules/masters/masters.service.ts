import { prisma } from '../../db/client'

export const mastersService = {
  async getPublicProfile(masterId: string) {
    return prisma.master.findUniqueOrThrow({
      where: { id: masterId },
      select: {
        id: true,
        name: true,
        photo: true,
        description: true,
        phone: true,
        location: true,
        lat: true,
        lng: true,
        rating: true,
        homeVisit: true,
        schedule: true,
        categories: {
          include: {
            services: {
              where: { isActive: true },
              include: { workPhotos: { orderBy: { order: 'asc' } } },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { client: { select: { name: true, photo: true } } },
        },
      },
    })
  },

  async getProfile(masterId: string) {
    return prisma.master.findUniqueOrThrow({
      where: { id: masterId },
      include: {
        schedule: true,
        categories: {
          include: {
            services: {
              include: { workPhotos: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    })
  },

  async updateProfile(masterId: string, data: {
    name?: string
    photo?: string
    description?: string
    contacts?: string
    phone?: string
    location?: string
    lat?: number
    lng?: number
    homeVisit?: boolean
    isOnboarded?: boolean
  }) {
    return prisma.master.update({
      where: { id: masterId },
      data,
    })
  },

  async getOnboardingReadiness(masterId: string) {
    const [master, schedule, categoriesCount, servicesCount] = await Promise.all([
      prisma.master.findUnique({
        where: { id: masterId },
        select: { name: true },
      }),
      prisma.schedule.findUnique({
        where: { masterId },
        select: { id: true },
      }),
      prisma.category.count({ where: { masterId } }),
      prisma.service.count({ where: { masterId, isActive: true } }),
    ])

    const missing: string[] = []

    if (!master?.name?.trim()) {
      missing.push('profile')
    }

    if (!schedule) {
      missing.push('schedule')
    }

    if (categoriesCount === 0) {
      missing.push('categories')
    }

    if (servicesCount === 0) {
      missing.push('services')
    }

    return {
      isReady: missing.length === 0,
      missing,
    }
  },

  async updatePayment(masterId: string, data: {
    cardNumber?: string
    vkPayLinked?: boolean
  }) {
    return prisma.master.update({
      where: { id: masterId },
      data,
    })
  },
}
