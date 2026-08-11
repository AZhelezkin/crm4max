import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { BookingFlowBottomButton, BookingFlowPillButton, BookingFlowToolbar } from '@/components/BookingFlowShell'
import ConfirmDialog from '@/components/ConfirmDialog'
import { ArrowLeftIcon } from '@/components/onboardingShared'
import { discountedPrice, formatPrice } from '@/types'
import { text } from '@/styles/typography'

import { useBookingSeriesGateway } from './gateway'
import type {
  BookingSeriesBatchCancelResponse,
  BookingSeriesGetResponse,
  BookingSeriesPreviewCancelRequest,
  BookingSeriesPreviewChangeResponse,
  BookingSeriesUpdateResponse,
  BookingSeriesStatus,
  SeriesBatchActionScope,
  SeriesSkippedReason,
} from './types'

const BOOKINGS_PAGE_LIMIT = 30

type BookingSeriesDetailBatchState =
  | { kind: 'preview'; response: BookingSeriesPreviewChangeResponse }
  | { kind: 'result'; response: BookingSeriesUpdateResponse | BookingSeriesBatchCancelResponse }
  | { kind: 'version-conflict'; actualVersion: number }

interface SeriesCancelIntent {
  scope: SeriesBatchActionScope
  anchorBookingId: string
  expectedSeriesVersion: number
}

interface SeriesActionError {
  stage: 'preview' | 'cancel'
  kind: 'version-conflict' | 'request' | 'missing-anchor' | 'not-active'
  actualVersion: number | null
}

interface BookingSeriesDetailViewProps {
  data: BookingSeriesGetResponse
  batchState?: BookingSeriesDetailBatchState | null
  onBack: () => void
  onEdit: () => void
  onEndFromNext: () => void
  onCancel: () => void
  onOpenBooking: (bookingId: string) => void
  onLoadMore?: () => void
  bookingsPageState?: 'idle' | 'loading' | 'error'
  actionsDisabled?: boolean
  endFromNextDisabled?: boolean
  cancelDisabled?: boolean
}

export default function BookingSeriesDetailPage() {
  const { seriesId } = useParams<{ seriesId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { enabled, gateway } = useBookingSeriesGateway()
  const [data, setData] = useState<BookingSeriesGetResponse | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'not-found' | 'error'>('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [bookingsPageState, setBookingsPageState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [cancelIntent, setCancelIntent] = useState<SeriesCancelIntent | null>(null)
  const [cancelPreview, setCancelPreview] = useState<BookingSeriesPreviewChangeResponse | null>(null)
  const [cancelResult, setCancelResult] = useState<BookingSeriesBatchCancelResponse | null>(() => {
    const routeState = location.state as { batchCancelResult?: unknown } | null
    return isBatchCancelResponse(routeState?.batchCancelResult) ? routeState.batchCancelResult : null
  })
  const [cancelError, setCancelError] = useState<SeriesActionError | null>(null)
  const [busyStage, setBusyStage] = useState<'preview' | 'cancel' | null>(null)

  useEffect(() => {
    if (!enabled || !gateway || !seriesId) return
    let active = true
    setLoadState('loading')
    setBookingsPageState('idle')
    gateway.get(seriesId, { limit: BOOKINGS_PAGE_LIMIT })
      .then((response) => {
        if (!active) return
        setData(response)
        setLoadState('loaded')
      })
      .catch((error: unknown) => {
        if (!active) return
        const status = (error as { response?: { status?: number } } | null)?.response?.status
        setLoadState(status === 404 ? 'not-found' : 'error')
      })
    return () => { active = false }
  }, [enabled, gateway, seriesId, loadAttempt])

  if (!enabled || !gateway || !seriesId) return null
  if (loadState === 'loading') return <SeriesState title="Загружаем серию…" onBack={() => navigate(-1)} />
  if (loadState === 'not-found') return <SeriesState title="Серия не найдена" onBack={() => navigate('/bookings')} />
  if (loadState === 'error' || !data) {
    return (
      <SeriesState
        title="Не удалось загрузить серию"
        onBack={() => navigate('/bookings')}
        onRetry={() => setLoadAttempt((attempt) => attempt + 1)}
      />
    )
  }

  const loadMoreBookings = async () => {
    const cursor = data.nextCursor
    if (!cursor || bookingsPageState === 'loading') return

    setBookingsPageState('loading')
    try {
      const response = await gateway.get(seriesId, { cursor, limit: BOOKINGS_PAGE_LIMIT })
      setData((current) => {
        if (!current) return response
        const bookingIds = new Set(current.bookings.map((booking) => booking.id))
        const appendedBookings = response.bookings.filter((booking) => {
          if (bookingIds.has(booking.id)) return false
          bookingIds.add(booking.id)
          return true
        })
        return {
          ...current,
          bookings: [...current.bookings, ...appendedBookings],
          nextCursor: response.nextCursor,
        }
      })
      setBookingsPageState('idle')
    } catch {
      setBookingsPageState('error')
    }
  }

  const runPreview = async (intent: SeriesCancelIntent) => {
    setBusyStage('preview')
    setCancelPreview(null)
    setCancelError(null)
    try {
      const response = await gateway.previewChange(seriesId, previewCancelRequest(intent))
      setCancelPreview(response)
    } catch (error) {
      setCancelError(toSeriesActionError(error, 'preview'))
    } finally {
      setBusyStage(null)
    }
  }

  const beginCancellation = (scope: SeriesBatchActionScope) => {
    if (busyStage || data.series.status !== 'ACTIVE') return
    const anchorBookingId = cancelAnchorBookingId(data, scope)
    if (!anchorBookingId) return

    const intent = { scope, anchorBookingId, expectedSeriesVersion: data.series.version }
    setCancelResult(null)
    setCancelIntent(intent)
    void runPreview(intent)
  }

  const applyCancellation = async () => {
    if (!cancelIntent || !cancelPreview || busyStage) return
    setBusyStage('cancel')
    setCancelError(null)
    try {
      const response = await gateway.cancel(cancelIntent.anchorBookingId, {
        scope: cancelIntent.scope,
        expectedSeriesVersion: cancelPreview.version,
      })
      if (!isBatchCancelResponse(response)) throw new Error('Batch cancellation response expected')

      setCancelResult(response)
      setData((current) => current
        ? { ...current, series: { ...current.series, ...response.series } }
        : current)
      setCancelPreview(null)
      setCancelIntent(null)
    } catch (error) {
      setCancelError(toSeriesActionError(error, 'cancel'))
    } finally {
      setBusyStage(null)
    }
  }

  const refreshAndRepeatPreview = async () => {
    if (!cancelIntent || busyStage) return
    setBusyStage('preview')
    setCancelError(null)
    try {
      const refreshed = await gateway.get(seriesId)
      setData(refreshed)
      if (refreshed.series.status !== 'ACTIVE') {
        setCancelPreview(null)
        setCancelError({ stage: 'preview', kind: 'not-active', actualVersion: null })
        return
      }

      const anchorBookingId = cancelAnchorBookingId(refreshed, cancelIntent.scope)
      if (!anchorBookingId) {
        setCancelPreview(null)
        setCancelError({ stage: 'preview', kind: 'missing-anchor', actualVersion: null })
        return
      }

      const refreshedIntent = {
        scope: cancelIntent.scope,
        anchorBookingId,
        expectedSeriesVersion: refreshed.series.version,
      }
      setCancelIntent(refreshedIntent)
      setCancelPreview(await gateway.previewChange(seriesId, previewCancelRequest(refreshedIntent)))
    } catch (error) {
      setCancelError(toSeriesActionError(error, 'preview'))
    } finally {
      setBusyStage(null)
    }
  }

  const retryCancellation = () => {
    if (!cancelError || busyStage) return
    if (cancelError.kind === 'version-conflict' || cancelError.kind === 'missing-anchor' || cancelError.kind === 'not-active') {
      void refreshAndRepeatPreview()
      return
    }
    if (cancelError.stage === 'cancel') {
      void applyCancellation()
      return
    }
    if (cancelIntent) void runPreview(cancelIntent)
  }

  const closeCancellationContext = () => {
    setCancelError(null)
    setCancelPreview(null)
    setCancelIntent(null)
  }

  const endFromNextAnchor = cancelAnchorBookingId(data, 'THIS_AND_FUTURE')
  const cancelAllAnchor = cancelAnchorBookingId(data, 'ALL')
  const actionsDisabled = busyStage !== null || cancelIntent !== null || cancelError !== null

  return (
    <>
      <BookingSeriesDetailView
        data={data}
        batchState={cancelResult ? { kind: 'result', response: cancelResult } : null}
        onBack={() => navigate(-1)}
        onEdit={() => navigate(`/booking-series/${data.series.id}/edit?scope=ALL`)}
        onEndFromNext={() => beginCancellation('THIS_AND_FUTURE')}
        onCancel={() => beginCancellation('ALL')}
        onOpenBooking={(bookingId) => navigate(`/bookings/${bookingId}`)}
        onLoadMore={() => { void loadMoreBookings() }}
        bookingsPageState={bookingsPageState}
        actionsDisabled={actionsDisabled}
        endFromNextDisabled={!endFromNextAnchor}
        cancelDisabled={!cancelAllAnchor}
      />

      {cancelPreview && cancelIntent && !cancelError && (
        <ConfirmDialog
          title={cancelIntent.scope === 'THIS_AND_FUTURE' ? 'Завершить серию?' : 'Отменить серию?'}
          message={cancelPreviewMessage(cancelPreview)}
          confirmLabel={busyStage === 'cancel'
            ? 'Отменяем…'
            : cancelIntent.scope === 'THIS_AND_FUTURE' ? 'Подтвердить завершение' : 'Подтвердить отмену'}
          cancelLabel="Назад"
          onConfirm={() => { void applyCancellation() }}
          onCancel={closeCancellationContext}
        />
      )}

      {cancelError && (
        <ConfirmDialog
          title={seriesActionErrorTitle(cancelError)}
          message={seriesActionErrorMessage(cancelError)}
          confirmLabel={busyStage ? 'Повторяем…' : cancelError.kind === 'request' ? 'Повторить' : 'Обновить и повторить'}
          cancelLabel="Вернуться к серии"
          danger={false}
          onConfirm={retryCancellation}
          onCancel={closeCancellationContext}
        />
      )}
    </>
  )
}

export function BookingSeriesDetailView({
  data,
  batchState = null,
  onBack,
  onEdit,
  onEndFromNext,
  onCancel,
  onOpenBooking,
  onLoadMore,
  bookingsPageState = 'idle',
  actionsDisabled = false,
  endFromNextDisabled = false,
  cancelDisabled = false,
}: BookingSeriesDetailViewProps) {
  const { series, bookings } = data
  const services = [...series.template.services].sort((left, right) => left.order - right.order)
  const servicePrice = (item: typeof services[number]) => item.price
    ?? discountedPrice(item.service.price, item.service.discountPercent)
    ?? item.service.price
  const totalPrice = series.template.totalPrice
    ?? services.reduce((sum, item) => sum + servicePrice(item), 0)
  const active = series.status === 'ACTIVE'

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <BookingFlowToolbar title="Серия записей" onBack={onBack} backIcon={<ArrowLeftIcon />} />

      <div style={{ flex: 1, padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={cardStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{seriesRuleSummary(series.rule.intervalWeeks, series.rule.slots)}</span>
            <SeriesStatusBadge status={series.status} />
          </span>
          <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
            {formatPeriod(series.startDate, series.endDate)}
          </span>
          {series.exceptionsCount > 0 && (
            <span style={{ ...text.caption2, color: 'var(--color-warning-surface-accented)' }}>
              Изменено отдельно: {series.exceptionsCount}
            </span>
          )}
        </div>

        <SectionTitle>Клиент</SectionTitle>
        <div style={{ ...cardStyle, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, overflow: 'hidden', background: 'var(--color-secondary-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {series.template.client.photo
              ? <img src={series.template.client.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ ...text.label3Caps, color: 'var(--color-on-surface)' }}>{initials(series.template.client.name)}</span>}
          </div>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{series.template.client.name}</span>
            <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
              {series.template.client.phone || (series.template.client.isMaxUser ? 'Клиент Max' : 'Без аккаунта Max')}
            </span>
          </span>
        </div>

        <SectionTitle>Услуги</SectionTitle>
        <div style={{ ...cardStyle, padding: 0 }}>
          {services.map((item) => (
            <div key={item.service.id} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-divider-low)' }}>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{item.service.name}</span>
                <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{item.service.duration} мин</span>
              </span>
              <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{formatPrice(servicePrice(item))}</span>
            </div>
          ))}
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)' }}>Итого</span>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{formatPrice(totalPrice)}</span>
          </div>
        </div>

        {series.manualActionCount > 0 && (
          <div style={warningCardStyle}>
            <span style={{ color: 'var(--color-warning-surface-accented)', display: 'flex', flexShrink: 0 }}><WarningIcon /></span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ ...text.callout1, color: 'var(--color-on-warning-surface-lite)' }}>Нужна отдельная обработка</span>
              <span style={{ ...text.caption2, color: 'var(--color-on-warning-surface-lite)' }}>
                Оплаченных будущих записей: {series.manualActionCount}
              </span>
              {series.manualActionBookings.map((booking) => (
                <button key={booking.bookingId} type="button" onClick={() => onOpenBooking(booking.bookingId)} style={warningLinkStyle}>
                  {formatLocalDate(booking.date)}, {booking.time}
                </button>
              ))}
            </span>
          </div>
        )}

        <SectionTitle>Ближайшие записи</SectionTitle>
        <div style={{ ...cardStyle, padding: 0 }}>
          {bookings.length === 0 ? (
            <span style={{ padding: '16px 20px', ...text.caption1, color: 'var(--color-on-surface-secondary)' }}>Будущих записей нет</span>
          ) : bookings.map((booking, index) => (
            <button
              key={booking.id}
              type="button"
              onClick={() => onOpenBooking(booking.id)}
              style={{
                width: '100%',
                border: 'none',
                borderBottom: index === bookings.length - 1 ? 'none' : '1px solid var(--color-divider-low)',
                background: 'none',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{formatLocalDate(booking.date)}</span>
                <span style={{ ...text.caption2, color: booking.status !== 'CANCELLED' && booking.series.isException ? 'var(--color-warning-surface-accented)' : 'var(--color-on-surface-secondary)' }}>
                  {booking.status === 'CANCELLED' ? 'Отменена' : booking.series.isException ? 'Изменена отдельно' : 'По расписанию'}
                </span>
              </span>
              <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{booking.time}</span>
              <ChevronRightIcon />
            </button>
          ))}
          {data.nextCursor && onLoadMore && (bookingsPageState === 'error' ? (
            <div role="alert" style={{ ...cardStyle, background: 'none', alignItems: 'center' }}>
              <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Не удалось загрузить ещё записи</span>
              <button type="button" onClick={onLoadMore} style={warningLinkStyle}>Повторить</button>
            </div>
          ) : (
            <div style={{ ...cardStyle, background: 'none', alignItems: 'center' }}>
              <button
                type="button"
                disabled={bookingsPageState === 'loading'}
                onClick={onLoadMore}
                style={{ ...warningLinkStyle, width: '100%', textAlign: 'center', cursor: bookingsPageState === 'loading' ? 'default' : 'pointer' }}
              >
                {bookingsPageState === 'loading' ? 'Загружаем…' : 'Показать ещё'}
              </button>
            </div>
          ))}
        </div>

        {batchState && (
          <SeriesBatchState
            state={batchState}
            onOpenBooking={onOpenBooking}
            getBookingLabel={(bookingId) => bookingLinkLabel(data, bookingId)}
          />
        )}
      </div>

      {active && (
        <div style={{ padding: '8px 12px calc(16px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" disabled={actionsDisabled} onClick={onEdit} style={buttonStateStyle(primaryButtonStyle, actionsDisabled)}>Изменить серию</button>
          <button
            type="button"
            disabled={actionsDisabled || endFromNextDisabled}
            title={endFromNextDisabled ? 'Нет ближайшей записи для завершения серии' : undefined}
            onClick={onEndFromNext}
            style={buttonStateStyle(secondaryButtonStyle, actionsDisabled || endFromNextDisabled)}
          >
            Завершить с ближайшей записи
          </button>
          <button
            type="button"
            disabled={actionsDisabled || cancelDisabled}
            title={cancelDisabled ? 'Нет записи серии для отмены' : undefined}
            onClick={onCancel}
            style={buttonStateStyle(dangerButtonStyle, actionsDisabled || cancelDisabled)}
          >
            Отменить серию
          </button>
        </div>
      )}
    </div>
  )
}

export function SeriesBatchState({
  state,
  onOpenBooking,
  getBookingLabel,
}: {
  state: NonNullable<BookingSeriesDetailViewProps['batchState']>
  onOpenBooking?: (bookingId: string) => void
  getBookingLabel?: (bookingId: string) => string
}) {
  if (state.kind === 'version-conflict') {
    return (
      <div style={errorCardStyle}>
        <span style={{ ...text.callout1, color: 'var(--color-on-error-surface-lite)' }}>Серия уже изменилась</span>
        <span style={{ ...text.caption2, color: 'var(--color-on-error-surface-lite)' }}>Актуальная версия: {state.actualVersion}. Черновик сохранён.</span>
      </div>
    )
  }

  const result = state.response.result
  const skipped = result.skipped
  const cancelled = 'cancelled' in result ? result.cancelled : 0

  if (!('updated' in result)) {
    return (
      <div style={successCardStyle}>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ ...text.callout1, color: 'var(--color-on-success-surface-lite)' }}>Отмена серии выполнена</span>
          <BatchLine label="Отменено" value={cancelled} />
          <BatchLine label="Пропущено" value={skipped.length} />
          {skipped.map((item) => onOpenBooking ? (
            <button
              key={item.bookingId}
              type="button"
              aria-label={`Открыть запись ${item.bookingId}`}
              onClick={() => onOpenBooking(item.bookingId)}
              style={warningLinkStyle}
            >
              {getBookingLabel?.(item.bookingId) ?? 'Открыть запись'} · {skippedReasonLabel(item.reason)}
            </button>
          ) : (
            <span key={item.bookingId} style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
              {skippedReasonLabel(item.reason)}
            </span>
          ))}
        </span>
      </div>
    )
  }

  return (
    <div style={state.kind === 'preview' ? warningCardStyle : successCardStyle}>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ ...text.callout1, color: state.kind === 'preview' ? 'var(--color-on-warning-surface-lite)' : 'var(--color-on-success-surface-lite)' }}>
          {state.kind === 'preview' ? 'Будут применены изменения' : 'Серия обновлена'}
        </span>
        <BatchLine label="Обновлено" value={result.updated} />
        <BatchLine label="Создано" value={result.created} />
        <BatchLine label="Заменено" value={result.superseded} />
        {cancelled > 0 && <BatchLine label="Отменено" value={cancelled} />}
        {skipped.length > 0 && <BatchLine label="Пропущено" value={skipped.length} />}
        {skipped.map((item) => onOpenBooking ? (
          <button
            key={item.bookingId}
            type="button"
            aria-label={`Открыть запись ${item.bookingId}`}
            onClick={() => onOpenBooking(item.bookingId)}
            style={warningLinkStyle}
          >
            {getBookingLabel?.(item.bookingId) ?? 'Открыть запись'} · {skippedReasonLabel(item.reason)}
          </button>
        ) : (
          <span key={item.bookingId} style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
            {skippedReasonLabel(item.reason)}
          </span>
        ))}
      </span>
    </div>
  )
}

function BatchLine({ label, value }: { label: string; value: number }) {
  return <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{label}: {value}</span>
}

function SeriesState({ title, onBack, onRetry }: { title: string; onBack: () => void; onRetry?: () => void }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <BookingFlowToolbar
        title="Серия записей"
        onBack={onBack}
        backIcon={<ArrowLeftIcon />}
        trailing={<BookingFlowPillButton onClick={onBack} ariaLabel="Закрыть"><CloseIcon /></BookingFlowPillButton>}
      />
      <div style={{ flex: 1, padding: '16px 20px', ...text.body2, color: 'var(--color-on-surface-secondary)', textAlign: 'center' }}>{title}</div>
      {onRetry && <BookingFlowBottomButton onClick={onRetry}>Повторить</BookingFlowBottomButton>}
    </div>
  )
}

function SeriesStatusBadge({ status }: { status: BookingSeriesStatus }) {
  const config = status === 'ACTIVE'
    ? { label: 'АКТИВНА', background: 'var(--color-success-surface-lite)', color: 'var(--color-on-success-surface-lite)' }
    : status === 'ENDED'
      ? { label: 'ЗАВЕРШЕНА', background: 'var(--color-secondary-surface)', color: 'var(--color-on-surface-secondary)' }
      : { label: 'ОТМЕНЕНА', background: 'var(--color-error-surface-lite)', color: 'var(--color-on-error-surface-lite)' }
  return (
    <span style={{ ...text.label2Caps, borderRadius: 8, padding: '2px 8px', background: config.background, color: config.color }}>
      {config.label}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '16px 8px 4px', ...text.caption3Caps, color: 'var(--color-on-surface)' }}>{children}</div>
}

function seriesRuleSummary(intervalWeeks: 1 | 2, slots: { dayOfWeek: number; time: string }[]): string {
  const labels = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const frequency = intervalWeeks === 1 ? 'Каждую неделю' : 'Раз в две недели'
  const sortedSlots = [...slots].sort((left, right) =>
    left.dayOfWeek - right.dayOfWeek || left.time.localeCompare(right.time),
  )
  return `${frequency} · ${sortedSlots.map((slot) => `${labels[slot.dayOfWeek]} ${slot.time}`).join(', ')}`
}

function formatPeriod(startDate: string, endDate: string | null): string {
  return endDate
    ? `${formatLocalDate(startDate)} - ${formatLocalDate(endDate)}`
    : `С ${formatLocalDate(startDate)} · без даты окончания`
}

function formatLocalDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)))
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length ? `${parts[0][0]}${parts[1]?.[0] ?? ''}`.toUpperCase() : '?'
}

function cancelAnchorBookingId(data: BookingSeriesGetResponse, scope: SeriesBatchActionScope): string | null {
  const nextOccurrenceId = nonEmptyId(data.series.nextOccurrence?.bookingId)
  if (scope === 'THIS_AND_FUTURE' || nextOccurrenceId) return nextOccurrenceId

  const listedActiveOccurrence = data.bookings.find((booking) =>
    booking.series.id === data.series.id
      && (booking.status === 'PENDING' || booking.status === 'CONFIRMED')
      && nonEmptyId(booking.id),
  )
  const manualActionOccurrence = data.series.manualActionBookings.find((booking) => nonEmptyId(booking.bookingId))
  const listedOccurrence = data.bookings.find((booking) =>
    booking.series.id === data.series.id && nonEmptyId(booking.id),
  )

  return nonEmptyId(listedActiveOccurrence?.id)
    ?? nonEmptyId(manualActionOccurrence?.bookingId)
    ?? nonEmptyId(listedOccurrence?.id)
}

function nonEmptyId(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed || null
}

function previewCancelRequest(intent: SeriesCancelIntent): BookingSeriesPreviewCancelRequest {
  return intent.scope === 'THIS_AND_FUTURE'
    ? {
        operation: 'CANCEL',
        scope: intent.scope,
        anchorBookingId: intent.anchorBookingId,
        expectedVersion: intent.expectedSeriesVersion,
      }
    : {
        operation: 'CANCEL',
        scope: intent.scope,
        expectedVersion: intent.expectedSeriesVersion,
      }
}

function cancelPreviewMessage(response: BookingSeriesPreviewChangeResponse): string {
  const { cancelled, skipped } = response.result
  const reasons = [...new Set(skipped.map((item) => skippedReasonLabel(item.reason)))]
  const reasonSummary = reasons.length > 0 ? ` Причины пропуска: ${reasons.join(', ')}.` : ''
  return `Будет отменено записей: ${cancelled}. Пропущено: ${skipped.length}.${reasonSummary}`
}

function toSeriesActionError(error: unknown, stage: SeriesActionError['stage']): SeriesActionError {
  const apiError = (error as {
    response?: { data?: { error?: { code?: string; details?: { actualVersion?: number } } } }
  }).response?.data?.error
  if (apiError?.code === 'SERIES_VERSION_CONFLICT') {
    return { stage, kind: 'version-conflict', actualVersion: apiError.details?.actualVersion ?? null }
  }
  return { stage, kind: 'request', actualVersion: null }
}

function seriesActionErrorTitle(error: SeriesActionError): string {
  if (error.kind === 'version-conflict') return 'Серия уже изменилась'
  if (error.kind === 'missing-anchor') return 'Нет доступной записи'
  if (error.kind === 'not-active') return 'Серия больше не активна'
  return error.stage === 'preview' ? 'Не удалось проверить отмену' : 'Не удалось отменить серию'
}

function seriesActionErrorMessage(error: SeriesActionError): string {
  if (error.kind === 'version-conflict') {
    const version = error.actualVersion === null ? '' : ` Актуальная версия: ${error.actualVersion}.`
    return `Данные серии устарели.${version} Обновим серию и повторно покажем проверку перед отменой.`
  }
  if (error.kind === 'missing-anchor') {
    return 'В актуальных данных нет записи, через которую можно безопасно выполнить действие.'
  }
  if (error.kind === 'not-active') {
    return 'Завершённые и отменённые серии доступны только для просмотра.'
  }
  return error.stage === 'preview'
    ? 'Проверка не выполнена. Контекст действия сохранён: повторите запрос или вернитесь к серии.'
    : 'Не удалось получить результат отмены. Контекст подтверждения сохранён: повторите запрос или вернитесь к серии.'
}

function isBatchCancelResponse(response: unknown): response is BookingSeriesBatchCancelResponse {
  if (!response || typeof response !== 'object') return false
  const candidate = response as Partial<BookingSeriesBatchCancelResponse>
  return Boolean(
    candidate.series
      && candidate.result
      && typeof candidate.result.cancelled === 'number'
      && Array.isArray(candidate.result.skipped),
  )
}

function bookingLinkLabel(data: BookingSeriesGetResponse, bookingId: string): string {
  const occurrence = data.bookings.find((booking) => booking.id === bookingId)
    ?? data.series.manualActionBookings.find((booking) => booking.bookingId === bookingId)
  return occurrence ? `${formatLocalDate(occurrence.date)}, ${occurrence.time}` : 'Открыть запись'
}

function skippedReasonLabel(reason: SeriesSkippedReason): string {
  return reason === 'LOCAL_EXCEPTION' ? 'изменены отдельно' : 'требуется обработать оплату'
}

function buttonStateStyle(style: React.CSSProperties, disabled: boolean): React.CSSProperties {
  return disabled
    ? {
        ...style,
        cursor: 'default',
        background: 'var(--color-secondary-surface-muted)',
        color: 'var(--color-interactive-element-muted)',
      }
    : style
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 20,
  padding: '16px 20px',
  boxSizing: 'border-box',
  background: 'var(--color-surface-transparent)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  overflow: 'hidden',
}

const warningCardStyle: React.CSSProperties = {
  ...cardStyle,
  background: 'var(--color-warning-surface-lite)',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
}

const successCardStyle: React.CSSProperties = {
  ...cardStyle,
  background: 'var(--color-success-surface-lite)',
}

const errorCardStyle: React.CSSProperties = {
  ...cardStyle,
  background: 'var(--color-error-surface-lite)',
}

const primaryButtonStyle: React.CSSProperties = {
  width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18,
  ...text.callout1, cursor: 'pointer',
  background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)',
}

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: 'var(--color-secondary-surface)', color: 'var(--color-on-surface)',
}

const dangerButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: 'var(--color-error-surface-lite)', color: 'var(--color-on-error-surface-lite)',
}

const warningLinkStyle: React.CSSProperties = {
  padding: 0,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  ...text.caption2,
  color: 'var(--color-active-element)',
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--color-interactive-element-secondary)' }}>
      <path d="M6 4L10.5 8L6 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 7.75V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.08 8.58v6.84c0 1.12-.6 2.16-1.57 2.73l-5.94 3.43c-.97.56-2.17.56-3.15 0l-5.94-3.43a3.15 3.15 0 0 1-1.57-2.73V8.58c0-1.12.6-2.16 1.57-2.73l5.94-3.43c.97-.56 2.17-.56 3.15 0l5.94 3.43c.97.57 1.57 1.6 1.57 2.73Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16.2h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
