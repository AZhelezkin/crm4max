import { useEffect, useRef, useState } from 'react'

import { clientsApi } from '@/api/clients.api'
import { servicesApi } from '@/api/services.api'
import { BookingFlowToolbar } from '@/components/BookingFlowShell'
import { FormCard, FormRow } from '@/components/BookingFormCard'
import ToggleSwitch from '@/components/ToggleSwitch'
import { ArrowLeftIcon, FloatingField } from '@/components/onboardingShared'
import { text } from '@/styles/typography'
import type { Client, Service } from '@/types'

import type {
  BookingSeriesTemplateChanges,
  BookingSeriesTemplateReadModel,
} from './types'

const POSTGRES_INT_MAX = 2_147_483_647

interface TemplateDraftClient {
  name: string
  clientId: string | null
  masterClientId: string | null
}

interface TemplateDraftService {
  serviceId: string
  name: string
  duration: number
  price: number | null
}

export interface BookingSeriesTemplateDraft {
  client: TemplateDraftClient | null
  services: TemplateDraftService[]
  totalPrice: string
  durationMinutes: string
  clientAddress: string
  notes: string
  remind: boolean
  color: string | null
}

interface BookingSeriesTemplateFieldsProps {
  initial: BookingSeriesTemplateReadModel
  draft: BookingSeriesTemplateDraft
  onChange: (draft: BookingSeriesTemplateDraft) => void
}

export function createBookingSeriesTemplateDraft(
  initial: BookingSeriesTemplateReadModel,
): BookingSeriesTemplateDraft {
  return {
    client: null,
    services: [...initial.services]
      .sort((left, right) => left.order - right.order)
      .map((item) => ({
        serviceId: item.service.id,
        name: item.service.name,
        duration: item.service.duration,
        price: item.price,
      })),
    totalPrice: formatMoneyInput(initial.totalPrice),
    durationMinutes: String(initial.durationMinutes),
    clientAddress: initial.clientAddress ?? '',
    notes: initial.notes ?? '',
    remind: initial.remind,
    color: initial.color,
  }
}

export function bookingSeriesTemplateDraftError(draft: BookingSeriesTemplateDraft): string | null {
  if (draft.services.length === 0) return 'Выберите хотя бы одну услугу.'
  if (draft.services.length > 20) return 'Можно выбрать не больше 20 услуг.'

  const durationMinutes = Number(draft.durationMinutes)
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || durationMinutes > POSTGRES_INT_MAX) {
    return 'Укажите длительность целым числом минут.'
  }

  if (parseMoneyInput(draft.totalPrice) === undefined) return 'Проверьте итоговую стоимость.'
  return null
}

export function bookingSeriesTemplateChanges(
  draft: BookingSeriesTemplateDraft,
): BookingSeriesTemplateChanges {
  const totalPrice = parseMoneyInput(draft.totalPrice)
  if (totalPrice === undefined) throw new Error('Invalid booking series total price')

  return {
    ...(draft.client === null
      ? {}
      : { clientId: draft.client.clientId, masterClientId: draft.client.masterClientId }),
    services: draft.services.map(({ serviceId, price }) => ({ serviceId, price })),
    totalPrice,
    durationMinutes: Number(draft.durationMinutes),
    clientAddress: draft.clientAddress.trim() || null,
    notes: draft.notes.trim() || null,
    remind: draft.remind,
    color: draft.color,
  }
}

export default function BookingSeriesTemplateFields({
  initial,
  draft,
  onChange,
}: BookingSeriesTemplateFieldsProps) {
  const [picker, setPicker] = useState<'client' | 'services' | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (picker === null || catalogLoading || clients.length > 0 || services.length > 0) return
    setCatalogLoading(true)
    setCatalogError(false)
    Promise.all([clientsApi.list(), servicesApi.list()])
      .then(([nextClients, nextServices]) => {
        if (!mounted.current) return
        setClients(nextClients)
        setServices(nextServices)
      })
      .catch(() => {
        if (mounted.current) setCatalogError(true)
      })
      .finally(() => {
        if (mounted.current) setCatalogLoading(false)
      })
    // Catalog state updates must not cancel the request that produced them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker])

  const selectedClientName = draft.client?.name ?? initial.client.name
  const selectedServiceNames = draft.services.map((service) => service.name).join(', ')

  const pickClient = (client: Client) => {
    onChange({
      ...draft,
      client: {
        name: client.name,
        clientId: client.clientId,
        masterClientId: client.clientId === null ? client.id : null,
      },
    })
    setPicker(null)
  }

  const toggleService = (service: Service) => {
    const existing = draft.services.find((item) => item.serviceId === service.id)
    if (existing && draft.services.length === 1) return
    const nextServices = existing
      ? draft.services.filter((item) => item.serviceId !== service.id)
      : [...draft.services, {
          serviceId: service.id,
          name: service.name,
          duration: service.duration,
          price: null,
        }]
    onChange({
      ...draft,
      services: nextServices,
      durationMinutes: String(nextServices.reduce((sum, item) => sum + item.duration, 0)),
    })
  }

  return (
    <>
      <FormCard title="Шаблон серии">
        <FormRow label="Клиент" value={selectedClientName} onClick={() => setPicker('client')} />
        <FormRow
          label="Услуги"
          value={selectedServiceNames || 'Выбрать'}
          prompt={draft.services.length === 0}
          onClick={() => setPicker('services')}
          last
        />
      </FormCard>

      <FloatingField
        label="Итоговая стоимость"
        value={draft.totalPrice}
        onChange={(totalPrice) => onChange({ ...draft, totalPrice })}
        inputMode="numeric"
        suffix="₽"
        error={parseMoneyInput(draft.totalPrice) === undefined}
      />
      <FloatingField
        label="Длительность"
        value={draft.durationMinutes}
        onChange={(durationMinutes) => onChange({ ...draft, durationMinutes })}
        type="number"
        inputMode="numeric"
        suffix="мин"
        error={bookingSeriesTemplateDraftError({ ...draft, totalPrice: '' })?.includes('длительность')}
      />
      <FloatingField
        label="Адрес клиента"
        value={draft.clientAddress}
        onChange={(clientAddress) => onChange({ ...draft, clientAddress })}
        maxLength={500}
      />
      <FloatingField
        label="Комментарий"
        value={draft.notes}
        onChange={(notes) => onChange({ ...draft, notes })}
        maxLength={4000}
        multiline
        autoGrow
      />

      <FormCard title="Уведомления">
        <FormRow
          label="Напоминать клиенту"
          right={<ToggleSwitch checked={draft.remind} onChange={(remind) => onChange({ ...draft, remind })} aria-label="Напоминать клиенту" />}
          noArrow
          last
        />
      </FormCard>

      {picker !== null && (
        <div style={pickerPageStyle} role="dialog" aria-modal="true" aria-label={picker === 'client' ? 'Выбор клиента' : 'Выбор услуг'}>
          <BookingFlowToolbar
            title={picker === 'client' ? 'Клиент' : 'Услуги'}
            onBack={() => setPicker(null)}
            backIcon={<ArrowLeftIcon />}
          />
          <div style={pickerContentStyle}>
            {catalogLoading && <div style={catalogMessageStyle}>Загружаем список…</div>}
            {catalogError && <div role="alert" style={catalogMessageStyle}>Не удалось загрузить список. Закройте и повторите.</div>}
            {!catalogLoading && !catalogError && picker === 'client' && (
              <FormCard title="Выберите клиента">
                {clients.map((client, index) => (
                  <FormRow
                    key={client.id}
                    label={client.name}
                    value={clientSelected(client, initial, draft) ? 'Выбран' : 'Выбрать'}
                    prompt={!clientSelected(client, initial, draft)}
                    onClick={() => pickClient(client)}
                    noArrow
                    last={index === clients.length - 1}
                  />
                ))}
              </FormCard>
            )}
            {!catalogLoading && !catalogError && picker === 'services' && (
              <FormCard title="Выберите услуги">
                {services
                  .filter((service) => (service.isActive && service.sessionsCount === 1)
                    || draft.services.some((selected) => selected.serviceId === service.id))
                  .map((service, index, available) => {
                    const selected = draft.services.some((item) => item.serviceId === service.id)
                    return (
                      <FormRow
                        key={service.id}
                        label={service.name}
                        value={selected ? 'Выбрано' : 'Добавить'}
                        prompt={!selected}
                        onClick={() => toggleService(service)}
                        noArrow
                        last={index === available.length - 1}
                      />
                    )
                  })}
              </FormCard>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function clientSelected(
  client: Client,
  initial: BookingSeriesTemplateReadModel,
  draft: BookingSeriesTemplateDraft,
): boolean {
  if (draft.client !== null) {
    return draft.client.clientId === client.clientId
      && draft.client.masterClientId === (client.clientId === null ? client.id : null)
  }
  return client.id === initial.client.id || client.clientId === initial.client.id
}

function formatMoneyInput(value: number | null): string {
  return value === null ? '' : String(value / 100).replace('.', ',')
}

function parseMoneyInput(value: string): number | null | undefined {
  if (value.trim() === '') return null
  const rubles = Number(value.trim().replace(',', '.'))
  if (!Number.isFinite(rubles) || rubles < 0) return undefined
  const kopecks = Math.round(rubles * 100)
  return kopecks <= POSTGRES_INT_MAX ? kopecks : undefined
}

const pickerPageStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  overflowY: 'auto',
  background: 'var(--color-background)',
}

const pickerContentStyle: React.CSSProperties = {
  padding: '8px 16px 32px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const catalogMessageStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderRadius: 20,
  background: 'var(--color-surface-transparent)',
  color: 'var(--color-on-surface-secondary)',
  ...text.caption1,
}
