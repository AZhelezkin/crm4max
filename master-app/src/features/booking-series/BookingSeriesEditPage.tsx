import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { BookingFlowBottomButton, BookingFlowToolbar } from '@/components/BookingFlowShell'
import { ArrowLeftIcon } from '@/components/onboardingShared'
import { text } from '@/styles/typography'

import RecurrenceEditor, { WarningSummary } from './RecurrenceEditor'
import BookingSeriesTemplateFields, {
  bookingSeriesTemplateChanges,
  bookingSeriesTemplateDraftError,
  createBookingSeriesTemplateDraft,
  type BookingSeriesTemplateDraft,
} from './BookingSeriesTemplateFields'
import { useBookingSeriesGateway } from './gateway'
import type {
  BookingSeriesGetResponse,
  BookingSeriesPreviewChangeResponse,
  BookingSeriesUpdateRequest,
  BookingSeriesUpdateResponse,
  RecurrenceRule,
  SeriesActionScope,
  SeriesBatchActionScope,
} from './types'

type LoadState = 'loading' | 'loaded' | 'not-found' | 'network-error' | 'error' | 'inactive'

type EditTarget =
  | { valid: true; scope: 'ALL' }
  | { valid: true; scope: 'THIS_AND_FUTURE'; anchorBookingId: string }
  | { valid: false }

interface MutationErrorState {
  phase: 'preview' | 'apply'
  message: string
}

export default function BookingSeriesEditPage() {
  const { seriesId } = useParams<{ seriesId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { enabled, gateway } = useBookingSeriesGateway()
  const requestedScope = searchParams.get('scope')
  const requestedAnchorBookingId = searchParams.get('anchorBookingId')
  const editTarget = parseEditTarget(requestedScope, requestedAnchorBookingId)
  const [data, setData] = useState<BookingSeriesGetResponse | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [draftRule, setDraftRule] = useState<RecurrenceRule | null>(null)
  const [draftTemplate, setDraftTemplate] = useState<BookingSeriesTemplateDraft | null>(null)
  const [preview, setPreview] = useState<BookingSeriesPreviewChangeResponse | null>(null)
  const [result, setResult] = useState<BookingSeriesUpdateResponse | null>(null)
  const [conflictVersion, setConflictVersion] = useState<number | null>(null)
  const [conflictRefreshing, setConflictRefreshing] = useState(false)
  const [conflictRefreshError, setConflictRefreshError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<MutationErrorState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!enabled || !gateway || !seriesId || !editTarget.valid) return
    let active = true
    setData(null)
    setLoadState('loading')
    setDraftRule(null)
    setDraftTemplate(null)
    setPreview(null)
    setResult(null)
    setConflictVersion(null)
    setConflictRefreshError(null)
    setMutationError(null)
    gateway.get(seriesId)
      .then((response) => {
        if (!active) return
        if (!response) {
          setLoadState('not-found')
          return
        }
        setData(response)
        setDraftTemplate(createBookingSeriesTemplateDraft(response.series.template))
        setLoadState('loaded')
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadState(loadStateForError(error))
      })
    return () => { active = false }
  }, [enabled, gateway, reloadKey, requestedAnchorBookingId, requestedScope, seriesId])

  if (!enabled || !gateway) {
    return <EditState title="Редактирование серий недоступно" onBack={() => navigate(-1)} />
  }
  if (!seriesId) {
    return <EditState title="Некорректная ссылка на серию" onBack={() => navigate(-1)} />
  }
  if (!editTarget.valid) {
    return (
      <EditState
        title="Некорректная область изменения"
        description="Откройте редактор из активной серии и выберите область заново"
        onBack={() => navigate(-1)}
      />
    )
  }
  if (loadState === 'loading') return <EditState title="Загружаем серию…" onBack={() => navigate(-1)} />
  if (loadState === 'not-found') return <EditState title="Серия не найдена" onBack={() => navigate('/bookings')} />
  if (loadState === 'inactive') {
    return <EditState title="Серия недоступна для изменения" description="Изменить можно только активную серию" onBack={() => navigate('/bookings')} />
  }
  if (loadState === 'network-error') {
    return (
      <EditState
        title="Нет связи с сервером"
        description="Проверьте подключение и повторите загрузку"
        onBack={() => navigate(-1)}
        onRetry={() => setReloadKey((current) => current + 1)}
      />
    )
  }
  if (loadState === 'error' || !data) {
    return (
      <EditState
        title="Не удалось загрузить серию"
        description="Повторите попытку или вернитесь назад"
        onBack={() => navigate(-1)}
        onRetry={() => setReloadKey((current) => current + 1)}
      />
    )
  }
  if (data.series.status !== 'ACTIVE') {
    return (
      <EditState
        title={data.series.status === 'ENDED' ? 'Серия завершена' : 'Серия отменена'}
        description="Изменить можно только активную серию"
        onBack={() => navigate(`/booking-series/${seriesId}`)}
      />
    )
  }

  const initialRule: RecurrenceRule = {
    startDate: data.series.startDate,
    endDate: data.series.endDate,
    intervalWeeks: data.series.rule.intervalWeeks,
    timezone: data.series.timezone,
    slots: data.series.rule.slots,
  }
  const templateDraft = draftTemplate ?? createBookingSeriesTemplateDraft(data.series.template)
  const templateError = bookingSeriesTemplateDraftError(templateDraft)

  const requestForRule = (rule: RecurrenceRule, allowConflicts: boolean): BookingSeriesUpdateRequest => editTarget.scope === 'THIS_AND_FUTURE'
    ? {
        expectedVersion: data.series.version,
        scope: editTarget.scope,
        anchorBookingId: editTarget.anchorBookingId,
        allowConflicts,
        changes: { template: bookingSeriesTemplateChanges(templateDraft), rule },
      }
    : {
        expectedVersion: data.series.version,
        scope: editTarget.scope,
        allowConflicts,
        changes: { template: bookingSeriesTemplateChanges(templateDraft), rule },
      }

  const previewRule = async (rule: RecurrenceRule) => {
    if (busy || templateError) return
    setDraftRule(rule)
    setMutationError(null)
    setConflictVersion(null)
    setConflictRefreshError(null)
    setBusy(true)
    try {
      const request = requestForRule(rule, false)
      const response = await gateway.previewChange(seriesId, { ...request, operation: 'UPDATE' })
      setPreview(response)
    } catch (error) {
      const actualVersion = readActualVersion(error)
      if (actualVersion !== null) {
        setConflictVersion(actualVersion)
      } else {
        const authoritativePreview = readSeriesConflictPreview(error)
        if (authoritativePreview?.result.warnings.length) {
          setPreview(authoritativePreview)
        } else {
          setMutationError({ phase: 'preview', message: mutationErrorMessage(error, 'preview') })
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const applyRule = async () => {
    if (!draftRule || !preview || busy) return
    const allowConflicts = preview.result.warnings.length > 0
    setMutationError(null)
    setConflictVersion(null)
    setConflictRefreshError(null)
    setBusy(true)
    try {
      const response = await gateway.update(seriesId, requestForRule(draftRule, allowConflicts))
      setResult(response)
      setPreview(null)
    } catch (error) {
      const actualVersion = readActualVersion(error)
      if (actualVersion !== null) {
        setConflictVersion(actualVersion)
      } else {
        const authoritativePreview = readSeriesConflictPreview(error)
        if (authoritativePreview?.result.warnings.length) {
          setPreview(authoritativePreview)
        } else {
          setMutationError({ phase: 'apply', message: mutationErrorMessage(error, 'apply') })
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const refreshAfterConflict = async () => {
    if (conflictRefreshing) return
    setConflictRefreshing(true)
    setConflictRefreshError(null)
    try {
      const response = await gateway.get(seriesId)
      if (!response) {
        setData(null)
        setPreview(null)
        setResult(null)
        setConflictVersion(null)
        setLoadState('not-found')
        return
      }
      setData(response)
      setLoadState('loaded')
      setPreview(null)
      setResult(null)
      setConflictVersion(null)
      setMutationError(null)
    } catch (error) {
      const nextLoadState = loadStateForError(error)
      if (nextLoadState === 'not-found' || nextLoadState === 'inactive') {
        setData(null)
        setPreview(null)
        setResult(null)
        setConflictVersion(null)
        setLoadState(nextLoadState)
      } else {
        setConflictRefreshError(loadErrorMessage(nextLoadState))
      }
    } finally {
      setConflictRefreshing(false)
    }
  }

  const retryMutation = () => {
    if (!mutationError || !draftRule) return
    if (mutationError.phase === 'preview') {
      void previewRule(draftRule)
    } else {
      void applyRule()
    }
  }

  const scope = editTarget.scope
  let content: React.ReactNode

  if (result) {
    content = (
      <BatchChangeView
        title="Серия обновлена"
        response={{ seriesId, version: result.series.version, result: { ...result.result, cancelled: 0 } }}
        mode="result"
        scope={scope}
        busy={false}
        onBack={() => navigate(`/booking-series/${seriesId}`)}
        onConfirm={() => navigate(`/booking-series/${seriesId}`)}
      />
    )
  } else if (preview) {
    content = (
      <BatchChangeView
        title="Проверка изменений"
        response={preview}
        mode="preview"
        scope={scope}
        busy={busy}
        onBack={() => setPreview(null)}
        onConfirm={() => { void applyRule() }}
      />
    )
  } else {
    content = (
      <RecurrenceEditor
        initialRule={draftRule ?? initialRule}
        title="Изменение серии"
        subtitle={scopeLabel(scope)}
        saveLabel="Проверить изменения"
        templateContent={(
          <BookingSeriesTemplateFields
            initial={data.series.template}
            draft={templateDraft}
            onChange={setDraftTemplate}
          />
        )}
        saveDisabled={templateError !== null}
        errorMessage={templateError}
        onBack={() => navigate(-1)}
        onSave={previewRule}
      />
    )
  }

  return (
    <>
      {content}
      {conflictVersion !== null && (
        <VersionConflictOverlay
          actualVersion={conflictVersion}
          busy={conflictRefreshing}
          error={conflictRefreshError}
          onRefresh={() => { void refreshAfterConflict() }}
          onBack={() => navigate(-1)}
        />
      )}
      {conflictVersion === null && mutationError && (
        <MutationErrorOverlay
          title={mutationError.phase === 'preview' ? 'Не удалось проверить изменения' : 'Не удалось обновить серию'}
          message={mutationError.message}
          busy={busy}
          onRetry={retryMutation}
          onBack={() => setMutationError(null)}
        />
      )}
    </>
  )
}

export function SeriesEditContextCard({ scope }: { scope: SeriesActionScope }) {
  return (
    <div style={{
      width: '100%',
      borderRadius: 20,
      padding: '16px 20px',
      boxSizing: 'border-box',
      background: scope === 'SINGLE' ? 'var(--color-secondary-surface)' : 'var(--color-primary-surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ ...text.callout1, color: scope === 'SINGLE' ? 'var(--color-on-surface)' : 'var(--color-on-primary-surface)' }}>
        {scopeLabel(scope)}
      </span>
      <span style={{ ...text.caption2, color: scope === 'SINGLE' ? 'var(--color-on-surface-secondary)' : 'var(--color-on-primary-surface)' }}>
        {scope === 'SINGLE'
          ? 'Эта запись станет исключением; расписание серии не изменится'
          : scope === 'THIS_AND_FUTURE'
            ? 'Выбранная и следующие будущие записи; прошедшие не изменятся'
            : 'Все будущие записи; прошедшие не изменятся'}
      </span>
    </div>
  )
}

export function BatchChangeView({
  title,
  response,
  mode,
  scope,
  busy,
  onBack,
  onConfirm,
}: {
  title: string
  response: BookingSeriesPreviewChangeResponse
  mode: 'preview' | 'result'
  scope: SeriesBatchActionScope
  busy: boolean
  onBack: () => void
  onConfirm: () => void
}) {
  const { result } = response
  const previewMode = mode === 'preview'
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <BookingFlowToolbar title={title} onBack={onBack} backIcon={<ArrowLeftIcon />} />
      <div style={{ flex: 1, padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SeriesEditContextCard scope={scope} />
        <div style={resultCardStyle}>
          <ResultLine label={previewMode ? 'Будет обновлено' : 'Обновлено'} value={result.updated} />
          <ResultLine label={previewMode ? 'Будет создано' : 'Создано'} value={result.created} />
          <ResultLine label={previewMode ? 'Будет заменено' : 'Заменено'} value={result.superseded} />
          <ResultLine label={previewMode ? 'Будет отменено' : 'Отменено'} value={result.cancelled} />
          <ResultLine label={previewMode ? 'Будет пропущено' : 'Пропущено'} value={result.skipped.length} />
        </div>
        {result.skipped.length > 0 && (
          <div style={warningCardStyle}>
            <span style={{ ...text.callout1, color: 'var(--color-on-warning-surface-lite)' }}>
              {previewMode ? 'Не все записи изменятся' : 'Не все записи изменились'}
            </span>
            {result.skipped.map((item) => (
              <span key={item.bookingId} style={{ ...text.caption2, color: 'var(--color-on-warning-surface-lite)' }}>
                {item.reason === 'LOCAL_EXCEPTION' ? 'Изменена отдельно' : 'Требуется обработать оплату'}
              </span>
            ))}
          </div>
        )}
        {result.warnings.length > 0 && <WarningSummary warnings={result.warnings} />}
      </div>
      <BookingFlowBottomButton disabled={busy} onClick={onConfirm}>
        {previewMode
          ? busy
            ? 'Сохраняем…'
            : result.warnings.length > 0
              ? 'Применить всё равно'
              : 'Применить изменения'
          : 'Открыть серию'}
      </BookingFlowBottomButton>
    </div>
  )
}

export function VersionConflictOverlay({
  actualVersion,
  busy,
  error,
  onRefresh,
  onBack,
}: {
  actualVersion: number
  busy: boolean
  error: string | null
  onRefresh: () => void
  onBack: () => void
}) {
  return (
    <div style={overlayBackdropStyle}>
      <div role="dialog" aria-modal="true" aria-label="Серия уже изменилась" style={overlayCardStyle}>
        <div style={{ padding: '0 8px 8px', ...text.h4, color: 'var(--color-on-surface)' }}>Серия уже изменилась</div>
        <div style={{ padding: '0 8px 8px', ...text.body2, color: 'var(--color-on-surface-secondary)' }}>
          Актуальная версия: {actualVersion}. Ваш черновик сохранён. Обновите серию и проверьте изменения заново.
        </div>
        {error && <div role="alert" style={{ padding: '0 8px 8px', ...text.caption2, color: 'var(--color-error-surface-accented)' }}>{error}</div>}
        <button type="button" disabled={busy} onClick={onRefresh} style={overlayPrimaryButtonStyle}>
          {busy ? 'Обновляем…' : 'Обновить серию'}
        </button>
        <button type="button" disabled={busy} onClick={onBack} style={overlaySecondaryButtonStyle}>
          Назад
        </button>
      </div>
    </div>
  )
}

export function MutationErrorOverlay({
  title,
  message,
  busy,
  onRetry,
  onBack,
}: {
  title: string
  message: string
  busy: boolean
  onRetry: () => void
  onBack: () => void
}) {
  return (
    <div style={overlayBackdropStyle}>
      <div role="alertdialog" aria-modal="true" aria-label={title} style={overlayCardStyle}>
        <div style={{ padding: '0 8px 8px', ...text.h4, color: 'var(--color-on-surface)' }}>{title}</div>
        <div style={{ padding: '0 8px 8px', ...text.body2, color: 'var(--color-on-surface-secondary)' }}>{message}</div>
        <button type="button" disabled={busy} onClick={onRetry} style={overlayPrimaryButtonStyle}>
          {busy ? 'Повторяем…' : 'Повторить'}
        </button>
        <button type="button" disabled={busy} onClick={onBack} style={overlaySecondaryButtonStyle}>
          Назад
        </button>
      </div>
    </div>
  )
}

function EditState({
  title,
  description,
  onBack,
  onRetry,
}: {
  title: string
  description?: string
  onBack: () => void
  onRetry?: () => void
}) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <BookingFlowToolbar title="Изменение серии" onBack={onBack} backIcon={<ArrowLeftIcon />} />
      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
        <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{title}</span>
        {description && <span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)' }}>{description}</span>}
      </div>
      {onRetry && <BookingFlowBottomButton onClick={onRetry}>Повторить</BookingFlowBottomButton>}
    </div>
  )
}

function ResultLine({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)' }}>{label}</span>
      <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{value}</span>
    </div>
  )
}

function scopeLabel(scope: SeriesActionScope): string {
  if (scope === 'SINGLE') return 'Только эта запись'
  if (scope === 'THIS_AND_FUTURE') return 'Эта и следующие'
  return 'Вся серия'
}

function parseEditTarget(scope: string | null, anchorBookingId: string | null): EditTarget {
  if (scope === 'ALL') return { valid: true, scope }
  if (scope === 'THIS_AND_FUTURE' && anchorBookingId?.trim()) {
    return { valid: true, scope, anchorBookingId: anchorBookingId.trim() }
  }
  return { valid: false }
}

interface ApiErrorResponse {
  status?: number
  data?: {
    error?: {
      code?: string
      message?: string
      details?: {
        actualVersion?: number
        preview?: BookingSeriesPreviewChangeResponse
      }
    }
  }
}

function apiErrorResponse(error: unknown): ApiErrorResponse | undefined {
  return (error as { response?: ApiErrorResponse } | null)?.response
}

function loadStateForError(error: unknown): Exclude<LoadState, 'loading' | 'loaded'> {
  const response = apiErrorResponse(error)
  const code = response?.data?.error?.code
  if (response?.status === 404 || code === 'SERIES_NOT_FOUND') return 'not-found'
  if (code === 'SERIES_NOT_ACTIVE') return 'inactive'
  if (!response) return 'network-error'
  return 'error'
}

function loadErrorMessage(state: Exclude<LoadState, 'loading' | 'loaded'>): string {
  if (state === 'network-error') return 'Нет связи с сервером. Проверьте подключение и повторите.'
  if (state === 'not-found') return 'Серия не найдена.'
  if (state === 'inactive') return 'Серия больше не активна.'
  return 'Не удалось обновить данные серии. Повторите попытку.'
}

function readActualVersion(error: unknown): number | null {
  const response = apiErrorResponse(error)
  if (response?.data?.error?.code !== 'SERIES_VERSION_CONFLICT') return null
  const actualVersion = response.data.error.details?.actualVersion
  return typeof actualVersion === 'number' ? actualVersion : null
}

function readSeriesConflictPreview(error: unknown): BookingSeriesPreviewChangeResponse | null {
  const response = apiErrorResponse(error)
  if (response?.data?.error?.code !== 'SERIES_CONFLICTS') return null
  return response.data.error.details?.preview ?? null
}

function mutationErrorMessage(error: unknown, phase: MutationErrorState['phase']): string {
  const response = apiErrorResponse(error)
  const code = response?.data?.error?.code
  if (!response) return 'Нет связи с сервером. Проверьте подключение и повторите.'
  if (code === 'SERIES_NOT_ACTIVE') return 'Серия больше не активна. Вернитесь назад и обновите данные.'
  if (code === 'SERIES_NOT_FOUND') return 'Серия не найдена. Вернитесь к списку записей.'
  if (code === 'INVALID_SERIES_SCOPE') return 'Область изменения устарела или недоступна. Вернитесь назад и выберите её заново.'
  return response.data?.error?.message
    ?? (phase === 'preview' ? 'Не удалось проверить изменения. Повторите попытку.' : 'Не удалось применить изменения. Повторите попытку.')
}

const resultCardStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 20,
  padding: '16px 20px',
  boxSizing: 'border-box',
  background: 'var(--color-surface-transparent)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const warningCardStyle: React.CSSProperties = {
  ...resultCardStyle,
  background: 'var(--color-warning-surface-lite)',
}

const overlayBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  background: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 32px',
}

const overlayCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 329,
  borderRadius: 24,
  padding: '20px 16px 24px',
  boxSizing: 'border-box',
  background: 'var(--color-surface)',
}

const overlayPrimaryButtonStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  borderRadius: 22,
  border: 'none',
  marginTop: 16,
  background: 'var(--color-primary-surface)',
  color: 'var(--color-on-primary-surface)',
  cursor: 'pointer',
  ...text.callout1,
}

const overlaySecondaryButtonStyle: React.CSSProperties = {
  ...overlayPrimaryButtonStyle,
  background: 'var(--color-secondary-surface)',
  color: 'var(--color-on-surface)',
}
