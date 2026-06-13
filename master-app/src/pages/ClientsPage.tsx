import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { text } from '@/styles/typography'
import { clientsApi } from '@/api/clients.api'
import type { Client } from '@/types'
import { FloatingField } from '@/components/onboardingShared'

// Вкладка «Клиенты» кабинета мастера (макеты 8951-33973 / 35261 / 34677 / 37129 / 37277 / 8952-34672 / 8949-65614).
// Все экраны живут внутри одного роута /clients (нижний таб-бар из MainLayout виден всегда),
// переключаются внутренним состоянием view.

type View = 'list' | 'search' | 'add' | 'detail' | 'edit'

// «+7 (913) 000-00-01» из 11 цифр; иначе — как есть.
function formatPhone(phone: string | null): string {
  if (!phone) return ''
  const d = phone.replace(/\D/g, '')
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) {
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`
  }
  return phone
}

// Инициалы: первые буквы первых двух слов имени.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

const VIOLET_GRADIENT =
  'linear-gradient(239.74deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.482%)'

export default function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<Client | null>(null)
  const [query, setQuery] = useState('')

  // Поля формы добавления/редактирования
  const [fName, setFName] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState(false)

  const load = () =>
    clientsApi.list().then((list) => { setClients(list); setLoaded(true) }).catch(() => setLoaded(true))

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '')),
    )
  }, [clients, query])

  // ─── Навигация ─────────────────────────────────────────────────────────────
  const openAdd = () => { setFName(''); setFPhone(''); setView('add') }
  const openDetail = (c: Client) => { setSelected(c); setView('detail') }
  const openEdit = () => {
    if (!selected) return
    setFName(selected.name); setFPhone(selected.phone ?? '')
    setView('edit')
  }

  const submitAdd = async () => {
    if (!fName.trim() || saving) return
    setSaving(true)
    try {
      await clientsApi.create({ name: fName.trim(), phone: fPhone.trim() || null })
      await load()
      setView('list')
    } finally { setSaving(false) }
  }

  const submitEdit = async () => {
    if (!selected || !fName.trim() || saving) return
    setSaving(true)
    try {
      const updated = await clientsApi.update(selected.id, { name: fName.trim(), phone: fPhone.trim() || null })
      setSelected(updated)
      await load()
      setView('detail')
    } finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!selected) return
    await clientsApi.remove(selected.id)
    setDeleting(false)
    setSelected(null)
    await load()
    setView('list')
  }

  // ─── Рендер ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh' }}>
      {view === 'list' && (
        <>
          <ListHeader
            hasClients={clients.length > 0}
            onAdd={openAdd}
            onSearch={() => { setQuery(''); setView('search') }}
          />
          <ClientList clients={clients} onPick={openDetail} loaded={loaded} />
        </>
      )}

      {view === 'search' && (
        <>
          <SearchHeader
            value={query}
            onChange={setQuery}
            onBack={() => { setQuery(''); setView('list') }}
          />
          <ClientList clients={filtered} onPick={openDetail} loaded />
        </>
      )}

      {view === 'add' && (
        <ClientForm
          title="Новый клиент"
          submitLabel="Добавить"
          name={fName} onName={setFName}
          phone={fPhone} onPhone={setFPhone}
          canSave={!!fName.trim() && !saving}
          onBack={() => setView('list')}
          onSubmit={submitAdd}
        />
      )}

      {view === 'edit' && (
        <ClientForm
          title="Данные клиента"
          submitLabel="Сохранить изменения"
          name={fName} onName={setFName}
          phone={fPhone} onPhone={setFPhone}
          canSave={!!fName.trim() && !saving}
          onBack={() => setView('detail')}
          onSubmit={submitEdit}
        />
      )}

      {view === 'detail' && selected && (
        <ClientDetail
          client={selected}
          onBack={() => setView('list')}
          onEdit={openEdit}
          onDelete={() => setDeleting(true)}
          onBook={() => navigate('/bookings/new', { state: { client: selected } })}
        />
      )}

      {deleting && selected && (
        <DeleteDialog
          name={selected.name}
          onCancel={() => setDeleting(false)}
          onConfirm={() => { void confirmDelete() }}
        />
      )}
    </div>
  )
}

// ─── Шапки ─────────────────────────────────────────────────────────────────────

// Базовая панель тулбара: h56, padding 6/12, контент по центру вертикали.
const toolbarStyle = {
  position: 'relative' as const,
  height: 56,
  display: 'flex',
  alignItems: 'center',
  padding: '6px 12px',
}

// Круглая кнопка 44 на фоне background (back / иконки тулбара).
function RoundButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        width: 44, height: 44, borderRadius: 22, flexShrink: 0,
        background: 'var(--color-background)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-on-surface)', padding: 0,
      }}
    >
      {children}
    </button>
  )
}

function ListHeader({ hasClients, onAdd, onSearch }: { hasClients: boolean; onAdd: () => void; onSearch: () => void }) {
  return (
    <div style={{ ...toolbarStyle, justifyContent: 'flex-end' }}>
      {/* Заголовок по центру */}
      <div style={{
        position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none',
        ...text.callout1, color: 'var(--color-on-surface)',
      }}>
        Клиенты
      </div>
      {/* Пилюля действий: add (+ поиск, если есть кого искать) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: 4,
        background: 'var(--color-background)', borderRadius: 22,
      }}>
        <IconButton onClick={onAdd} label="Добавить клиента"><AddIcon /></IconButton>
        {hasClients && <IconButton onClick={onSearch} label="Поиск"><SearchIcon /></IconButton>}
      </div>
    </div>
  )
}

// Иконка-кнопка 24 с padding 6 (внутри пилюли).
function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-on-surface)',
      }}
    >
      {children}
    </button>
  )
}

function SearchHeader({ value, onChange, onBack }: { value: string; onChange: (v: string) => void; onBack: () => void }) {
  return (
    <div style={{ ...toolbarStyle, gap: 8 }}>
      <RoundButton onClick={onBack} label="Назад"><ArrowLeftIcon /></RoundButton>
      <div style={{
        flex: 1, minWidth: 0, height: 44, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderRadius: 22, background: 'var(--color-background)',
      }}>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Поиск"
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            color: 'var(--color-on-surface)', fontFamily: 'inherit',
            fontSize: 18, lineHeight: '24px', fontWeight: 400, padding: 0,
          }}
        />
        {value && (
          <button
            type="button"
            aria-label="Очистить"
            onClick={() => onChange('')}
            style={{
              width: 20, height: 20, flexShrink: 0, padding: 0, border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-on-surface-secondary)',
            }}
          >
            <ClearIcon />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Список / карточка списка ────────────────────────────────────────────────────

function ClientList({ clients, onPick, loaded }: { clients: Client[]; onPick: (c: Client) => void; loaded: boolean }) {
  if (!loaded) return null
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {clients.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            background: 'var(--color-surface-transparent)', border: 'none', cursor: 'pointer',
            borderRadius: 20, padding: '16px 20px', textAlign: 'left',
          }}
        >
          <ClientAvatar name={c.name} photo={c.photo} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.name}
            </div>
            {c.phone && (
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatPhone(c.phone)}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

// Аватар клиента: фото Max-клиента, иначе фиолетовый градиент + инициалы.
function ClientAvatar({ name, photo, size }: { name: string; photo: string | null; size: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2, flexShrink: 0, overflow: 'hidden',
      background: photo ? 'var(--color-surface)' : VIOLET_GRADIENT,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {photo
        ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{
            ...(size >= 104 ? text.callout2 : text.label3Caps),
            color: 'var(--color-on-surface)',
          }}>
            {initials(name)}
          </span>
      }
    </div>
  )
}

// ─── Форма добавления / редактирования ───────────────────────────────────────────

function ClientForm({
  title, submitLabel, name, onName, phone, onPhone, canSave, onBack, onSubmit,
}: {
  title: string; submitLabel: string
  name: string; onName: (v: string) => void
  phone: string; onPhone: (v: string) => void
  canSave: boolean; onBack: () => void; onSubmit: () => void
}) {
  return (
    <>
      <div style={toolbarStyle}>
        <RoundButton onClick={onBack} label="Назад"><ArrowLeftIcon /></RoundButton>
        <div style={{
          position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none',
          ...text.callout1, color: 'var(--color-on-surface)',
        }}>
          {title}
        </div>
      </div>

      <div style={{ padding: '12px 16px calc(48px + env(safe-area-inset-bottom))' }}>
        <FloatingField label="Имя и фамилия" value={name} onChange={onName} valueBold autoFocus />
        <div style={{ marginTop: 16 }}>
          <FloatingField label="Номер телефона" value={phone} onChange={onPhone} valueBold type="tel" inputMode="tel" />
        </div>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSubmit}
          style={{
            width: '100%', height: 60, marginTop: 32, borderRadius: 20, border: 'none', padding: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...text.callout1,
            cursor: canSave ? 'pointer' : 'default',
            background: canSave ? 'var(--color-primary-surface)' : 'var(--color-secondary-surface-muted)',
            color: canSave ? 'var(--color-on-primary-surface)' : 'var(--color-interactive-element-muted)',
          }}
        >
          {submitLabel}
        </button>
      </div>
    </>
  )
}

// ─── Карточка клиента ───────────────────────────────────────────────────────────

function ClientDetail({ client, onBack, onEdit, onDelete, onBook }: {
  client: Client; onBack: () => void; onEdit: () => void; onDelete: () => void; onBook: () => void
}) {
  // Запись доступна только для клиентов с аккаунтом Max (есть глобальный clientId).
  const bookable = client.clientId != null
  return (
    <>
      <div style={{ ...toolbarStyle, justifyContent: 'space-between' }}>
        <RoundButton onClick={onBack} label="Назад"><ArrowLeftIcon /></RoundButton>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              height: 44, padding: '0 16px', borderRadius: 22, border: 'none', cursor: 'pointer',
              background: 'var(--color-background)', ...text.callout1, color: 'var(--color-on-surface)',
            }}
          >
            Править
          </button>
          <RoundButton onClick={onDelete} label="Удалить"><TrashIcon /></RoundButton>
        </div>
      </div>

      <div style={{ padding: '16px 16px calc(48px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <ClientAvatar name={client.name} photo={client.photo} size={104} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%' }}>
          <div style={{ ...text.h2, color: 'var(--color-on-surface)', textAlign: 'center' }}>{client.name}</div>
          {client.phone && (
            <div style={{ fontSize: 15, lineHeight: '20px', fontWeight: 400, letterSpacing: -0.15, color: 'var(--color-on-surface-secondary)', textAlign: 'center' }}>
              {formatPhone(client.phone)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          {/* «Записать на приём» → флоу записи мастером с предвыбранным клиентом.
              Для клиентов без аккаунта Max запись недоступна (нужен clientId). */}
          <ActionRow label="Записать на приём" onClick={onBook} disabled={!bookable} />
          {/* «Написать в MAX» — пока без навигации (нет инфраструктуры чата). */}
          <ActionRow label="Написать в MAX" onClick={() => { /* TODO */ }} disabled />
        </div>
      </div>
    </>
  )
}

function ActionRow({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: 56,
        background: 'var(--color-surface-transparent)', border: 'none',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        borderRadius: 20, padding: '16px 20px', textAlign: 'left',
      }}
    >
      <span style={{ flex: 1, ...text.callout1, color: 'var(--color-on-surface)' }}>{label}</span>
      <ChevronRightIcon />
    </button>
  )
}

// ─── Диалог удаления ─────────────────────────────────────────────────────────────

function DeleteDialog({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 329, boxSizing: 'border-box',
          background: 'var(--color-surface)', borderRadius: 24, padding: '20px 16px 24px',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '0 8px 8px', fontSize: 20, lineHeight: '24px', fontWeight: 700, letterSpacing: -0.4, color: 'var(--color-on-surface)' }}>
          Удалить клиента
        </div>
        <div style={{ padding: '0 8px 8px', ...text.body2, color: 'var(--color-on-surface)' }}>
          Вы действительно хотите удалить клиента {name}?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              width: '100%', height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
              background: 'var(--color-error-surface-accented)', ...text.callout1, color: 'var(--color-on-primary-surface)',
            }}
          >
            Удалить
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              width: '100%', height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
              background: 'var(--color-background)', ...text.callout1, color: 'var(--color-on-surface)',
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Иконки ───────────────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12L9.57 18.07" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 12H3.67" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 12H18M12 6V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M11.5 21a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 22L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/trash (нормализован в 24)
function TrashIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21 5.98c-3.33-.33-6.68-.5-10.02-.5-1.98 0-3.96.1-5.94.3L3 5.98M8.5 4.97l.22-1.31C8.88 2.71 9 2 10.69 2h2.62c1.69 0 1.82.75 1.97 1.67l.22 1.3M18.85 9.14l-.65 10.07C18.09 20.78 18 22 15.21 22H8.79C6 22 5.91 20.78 5.8 19.21L5.15 9.14M10.33 16.5h3.33M9.5 12.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M6 4L10.5 8L6 12" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
