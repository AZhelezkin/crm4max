import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const MASTER_ID = '394a6a20-95bd-4c03-b26b-7faa742bc88d'
const PHOTOS = {
  'Маникюр':       'https://storage.yandexcloud.net/crm4max-media/categories/2b8438ea-4112-4208-91ef-978eed672951.jpg',
  'Педикюр':       'https://storage.yandexcloud.net/crm4max-media/categories/16defa8f-4410-402c-8618-733291d214fc.jpg',
  'Наращивание':   'https://storage.yandexcloud.net/crm4max-media/categories/005281b0-e0cf-4855-be3c-5e62b90dc40b.jpg',
  'Дизайн ногтей': 'https://storage.yandexcloud.net/crm4max-media/categories/d8abb07e-6a8c-4605-acbf-3e24011ad6d3.jpg',
}
async function main() {
  const cats = await prisma.category.findMany({ where: { masterId: MASTER_ID } })
  for (const cat of cats) {
    const photo = PHOTOS[cat.name]
    if (photo) {
      await prisma.category.update({ where: { id: cat.id }, data: { photo } })
      console.log('v', cat.name)
    }
  }
  console.log('Done')
}
main().catch(e => { console.error(e.message); process.exit(1) }).finally(() => prisma.$disconnect())