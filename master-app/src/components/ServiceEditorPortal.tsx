import { useEffect, useState } from 'react'
import { servicesApi } from '@/api/services.api'
import type { Service } from '@/types'
import type { LocalWorkPhoto } from '@/lib/workPhotos'
import { getFirstUploadedWorkPhotoUrl } from '@/lib/workPhotos'
import ServiceFormPortal from '@/components/ServiceFormPortal'
import PopularServicesPortal from '@/components/PopularServicesPortal'

/** Что редактируем: создание новой услуги или правка существующей. `null` → закрыто. */
export type ServiceEditorTarget =
  | { mode: 'create' }
  | { mode: 'edit'; service: Service }

interface Props {
  /** Цель редактирования. Должна храниться в state родителя (стабильная ссылка) —
   *  поля инициализируются в useEffect по смене ссылки. */
  target: ServiceEditorTarget | null
  onClose: () => void
  /** Вызывается после успешного сохранения/удаления — родитель перезагружает списки. */
  onSaved?: () => void
}

/**
 * Единый редактор услуги (Figma «profile-service-create» / «Редактирование услуги»):
 * владеет полями формы + логикой create/update/delete и фото работ. Используется
 * и в каталоге услуг (ServicesCatalog), и инлайн во флоу записи (CreateBookingPage),
 * чтобы правка услуги при записи не уводила из флоу и не теряла черновик.
 */
export default function ServiceEditorPortal({ target, onClose, onSaved }: Props) {
  const editService = target?.mode === 'edit' ? target.service : null

  const [showPopular, setShowPopular] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(10)
  const [isPackage, setIsPackage] = useState(false)
  const [sessionsCount, setSessionsCount] = useState(2)
  const [workPhotos, setWorkPhotos] = useState<LocalWorkPhoto[]>([])

  // Инициализация полей при открытии (edit — из услуги, create — пустая форма).
  useEffect(() => {
    if (!target) return
    setShowPopular(false)
    if (target.mode === 'edit') {
      const s = target.service
      setName(s.name)
      setDesc(s.description ?? '')
      setPrice(String(s.price / 100))
      setDuration(String(s.duration))
      setDiscountEnabled(!!s.discountPercent)
      setDiscountPercent(s.discountPercent ?? 10)
      setIsPackage(s.sessionsCount > 1)
      setSessionsCount(s.sessionsCount > 1 ? s.sessionsCount : 2)
      setWorkPhotos((s.workPhotos ?? []).map((p) => ({ id: p.id, url: p.url, previewUrl: p.url, uploading: false })))
    } else {
      setName(''); setDesc(''); setPrice(''); setDuration('')
      setDiscountEnabled(false); setDiscountPercent(10)
      setIsPackage(false); setSessionsCount(2); setWorkPhotos([])
    }
  }, [target])

  const save = async () => {
    if (!name.trim()) return
    const firstPhotoUrl = getFirstUploadedWorkPhotoUrl(workPhotos)
    const data = {
      name: name.trim(),
      description: desc || null,
      price: Math.round(Number(price) * 100) || 0,
      duration: Number(duration) || 30,
      // null (а не undefined) — чтобы при выключении скидки она обнулялась в БД.
      discountPercent: discountEnabled ? discountPercent : null,
      sessionsCount: isPackage ? sessionsCount : 1,
      photo: firstPhotoUrl || null,
    }
    if (editService) {
      await servicesApi.update(editService.id, data)
      const origIds = new Set((editService.workPhotos ?? []).map((p) => p.id))
      const currentIds = new Set(workPhotos.map((p) => p.id))
      for (const id of origIds) {
        if (!currentIds.has(id)) await servicesApi.removeWorkPhoto(id)
      }
      const newPhotos = workPhotos.filter((p) => !origIds.has(p.id) && p.url)
      for (let i = 0; i < newPhotos.length; i++) {
        await servicesApi.addWorkPhoto(editService.id, newPhotos[i].url as string, i)
      }
    } else {
      const created = await servicesApi.create(data)
      const uploaded = workPhotos.filter((p) => !p.uploading && p.url)
      for (let i = 0; i < uploaded.length; i++) {
        await servicesApi.addWorkPhoto(created.id, uploaded[i].url as string, i)
      }
    }
    onClose()
    onSaved?.()
  }

  const remove = async () => {
    if (!editService) return
    await servicesApi.remove(editService.id)
    onClose()
    onSaved?.()
  }

  return (
    <>
      <ServiceFormPortal
        visible={!!target}
        isEdit={!!editService}
        name={name}
        onNameChange={setName}
        desc={desc}
        onDescChange={setDesc}
        duration={duration}
        onDurationChange={setDuration}
        price={price}
        onPriceChange={setPrice}
        discountEnabled={discountEnabled}
        onDiscountEnabledChange={setDiscountEnabled}
        discountPercent={discountPercent}
        onDiscountPercentChange={setDiscountPercent}
        isPackage={isPackage}
        onIsPackageChange={setIsPackage}
        sessionsCount={sessionsCount}
        onSessionsCountChange={setSessionsCount}
        workPhotos={workPhotos}
        onWorkPhotosChange={setWorkPhotos}
        onClose={onClose}
        onSave={() => { void save() }}
        onDelete={editService ? () => { void remove() } : undefined}
        onPickPopular={() => setShowPopular(true)}
      />
      <PopularServicesPortal
        visible={showPopular}
        onClose={() => setShowPopular(false)}
        onSelect={(popularName) => { setName(popularName); setShowPopular(false) }}
      />
    </>
  )
}
