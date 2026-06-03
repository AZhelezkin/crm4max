import { text } from '@/styles/typography'
import { useEffect, useRef, useState } from 'react'

const SUGGEST_URL = 'https://suggest-maps.yandex.ru/v1/suggest'
const GEOCODE_URL = 'https://geocode-maps.yandex.ru/1.x/'
const STATIC_MAP_URL = 'https://static-maps.yandex.ru/1.x/'
const API_KEY = import.meta.env.VITE_YANDEX_SUGGEST_KEY as string
const GEOCODE_KEY = import.meta.env.VITE_YANDEX_GEOCODE_KEY as string
const JSMAPS_KEY = import.meta.env.VITE_YANDEX_JSMAPS_KEY as string | undefined
const DEFAULT_CENTER: [number, number] = [37.62007, 55.75363] // Москва, [lon, lat]
const DEFAULT_ZOOM = 16

interface Suggestion {
  title: string
  subtitle: string
}

/**
 * Отрезаем страну/регион/город от полного адреса — оставляем только улицу + дом.
 * Полная строка у Yandex обычно вида "Россия, Москва, Тверская улица, 7":
 * берём последние две запятые, остальное отбрасываем. Для коротких адресов
 * (<= 2 частей) ничего не трогаем.
 */
function shortenAddress(full: string): string {
  if (!full) return ''
  const parts = full.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length <= 2) return parts.join(', ')
  return parts.slice(-2).join(', ')
}

// Прямое геокодирование: адрес → координаты (lon, lat)
async function geocodeAddress(address: string): Promise<[number, number] | null> {
  const params = new URLSearchParams({
    geocode: address,
    format: 'json',
    results: '1',
    ...(GEOCODE_KEY ? { apikey: GEOCODE_KEY } : {}),
  })
  try {
    const res = await fetch(`${GEOCODE_URL}?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    const pos = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos
    if (typeof pos !== 'string') return null
    const [lon, lat] = pos.split(' ').map(Number)
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
    return [lon, lat]
  } catch {
    return null
  }
}

// Обратное геокодирование: координаты → адрес здания
async function reverseGeocode(lon: number, lat: number, signal?: AbortSignal): Promise<string | null> {
  const params = new URLSearchParams({
    geocode: `${lon},${lat}`,
    format: 'json',
    results: '1',
    kind: 'house',
    ...(GEOCODE_KEY ? { apikey: GEOCODE_KEY } : {}),
  })
  try {
    const res = await fetch(`${GEOCODE_URL}?${params}`, { signal })
    if (!res.ok) return null
    const data = await res.json()
    const geoObject = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
    if (!geoObject) return null
    // Берём «человеческий» адрес целиком: metaDataProperty.GeocoderMetaData.text
    const text: string | undefined = geoObject?.metaDataProperty?.GeocoderMetaData?.text
    return text ?? null
  } catch {
    return null
  }
}

// Ленивая загрузка Yandex Maps v3 SDK
let ymapsLoaderPromise: Promise<any> | null = null
function loadYmaps(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  const anyWin = window as any
  if (anyWin.ymaps3) return anyWin.ymaps3.ready.then(() => anyWin.ymaps3)
  if (ymapsLoaderPromise) return ymapsLoaderPromise
  if (!JSMAPS_KEY) return Promise.reject(new Error('VITE_YANDEX_JSMAPS_KEY is not set'))

  ymapsLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(JSMAPS_KEY)}&lang=ru_RU`
    script.async = true
    script.onload = () => {
      const ymaps3 = (window as any).ymaps3
      if (!ymaps3) { reject(new Error('ymaps3 not available after script load')); return }
      ymaps3.ready.then(() => resolve(ymaps3)).catch(reject)
    }
    script.onerror = () => reject(new Error('Failed to load Yandex Maps v3 SDK'))
    document.head.appendChild(script)
  })
  return ymapsLoaderPromise
}

interface Props {
  value: string
  onChange: (v: string) => void
  onGeocode?: (lat: number, lng: number) => void
  confirmedAddress?: string
  /** Назад/закрыть — рендерит круглую кнопку слева от поиска (макет 8794:63351) */
  onBack?: () => void
}

export default function AddressSuggestInput({ value, onChange, onGeocode, confirmedAddress = '', onBack }: Props) {
  // inputValue — «короткий» адрес, который видит пользователь (улица + дом).
  // Полный адрес отдаём наверх через onChange — он и летит в БД.
  const [inputValue, setInputValue] = useState(() => shortenAddress(value))
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestEnabled, setSuggestEnabled] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const ymapsRef = useRef<any>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reverseAbortRef = useRef<AbortController | null>(null)
  const skipNextActionEndRef = useRef(false)
  // Полный адрес, который мы в последний раз отдали через onChange — чтобы value-sync эффект
  // игнорировал эхо нашего же апдейта и не перезатирал «короткий» display.
  const lastEmittedFullRef = useRef<string>(value)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onGeocodeRef = useRef(onGeocode)
  onGeocodeRef.current = onGeocode

  // Синхронизация value → inputValue при смене снаружи.
  // Пропускаем, если это эхо нашего onChange (value === lastEmittedFullRef),
  // иначе рендерим короткий вариант.
  useEffect(() => {
    if (value === lastEmittedFullRef.current) return
    lastEmittedFullRef.current = value
    setInputValue(shortenAddress(value))
    setSuggestEnabled(false)
    setSuggestions([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Инициализация интерактивной карты
  useEffect(() => {
    if (!JSMAPS_KEY) { setMapFailed(true); return }
    let cancelled = false

    loadYmaps()
      .then((ymaps3) => {
        if (cancelled || !mapContainerRef.current) return
        ymapsRef.current = ymaps3

        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener } = ymaps3

        // Создаём карту сразу с DEFAULT_CENTER, чтобы контейнер не стоял пустым,
        // а нужный центр подтянем асинхронно после forward-geocode.
        const map = new YMap(mapContainerRef.current, {
          location: { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM },
          theme: 'dark',
          behaviors: ['drag', 'pinchZoom', 'scrollZoom', 'dblClick', 'oneFingerZoom'],
        })
        map.addChild(new YMapDefaultSchemeLayer({}))
        map.addChild(new YMapDefaultFeaturesLayer({}))

        // Слушатель окончания перетаскивания
        const listener = new YMapListener({
          onActionEnd: () => {
            if (skipNextActionEndRef.current) {
              skipNextActionEndRef.current = false
              return
            }
            const loc = map.center as [number, number] | undefined
            if (!loc) return
            const [lon, lat] = loc
            if (reverseAbortRef.current) reverseAbortRef.current.abort()
            const ctrl = new AbortController()
            reverseAbortRef.current = ctrl
            reverseGeocode(lon, lat, ctrl.signal).then((text) => {
              if (ctrl.signal.aborted) return
              const nextFull = text ?? ''
              const nextDisplay = shortenAddress(nextFull)
              lastEmittedFullRef.current = nextFull
              setInputValue(nextDisplay)
              setSuggestEnabled(false)
              setSuggestions([])
              onChangeRef.current(nextFull)
              onGeocodeRef.current?.(lat, lon)
            })
          },
        })
        map.addChild(listener)

        mapInstanceRef.current = map
        setMapReady(true)

        // Асинхронно центрируем на существующем адресе
        const initial = confirmedAddress?.trim() || value?.trim()
        if (initial) {
          geocodeAddress(initial).then((coords) => {
            if (cancelled || !coords) return
            skipNextActionEndRef.current = true
            try { map.update({ location: { center: coords, zoom: DEFAULT_ZOOM } }) } catch { /* ignore */ }
          })
        }
      })
      .catch(() => {
        if (!cancelled) setMapFailed(true)
      })

    return () => {
      cancelled = true
      if (reverseAbortRef.current) reverseAbortRef.current.abort()
      try { mapInstanceRef.current?.destroy?.() } catch { /* ignore */ }
      mapInstanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Suggest
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const text = inputValue.trim()
    if (!text || !API_KEY || !suggestEnabled) { setSuggestions([]); return }

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          apikey: API_KEY, text, lang: 'ru', results: '5',
          types: 'house,street', print_address: '1',
        })
        const res = await fetch(`${SUGGEST_URL}?${params}`)
        if (!res.ok) return
        const data = await res.json()
        setSuggestions(
          (data.results ?? []).map((r: any) => ({
            title: r.title?.text ?? '',
            subtitle: r.subtitle?.text ?? '',
          }))
        )
      } catch { /* ignore */ }
    }, 300)
  }, [inputValue, suggestEnabled])

  // Пан карты к выбранному адресу
  const panMapTo = (lon: number, lat: number) => {
    const map = mapInstanceRef.current
    if (!map) return
    skipNextActionEndRef.current = true
    try {
      map.update({ location: { center: [lon, lat], zoom: DEFAULT_ZOOM, duration: 400 } })
    } catch {
      // Старые версии API могут не поддерживать duration
      try { map.setLocation({ center: [lon, lat], zoom: DEFAULT_ZOOM }) } catch { /* ignore */ }
    }
  }

  const handleSelect = (s: Suggestion) => {
    // Yandex Suggest уже разбивает на title (улица + дом) и subtitle (город/страна)
    const full = s.subtitle ? `${s.title}, ${s.subtitle}` : s.title
    const display = s.title
    lastEmittedFullRef.current = full
    setInputValue(display)
    onChange(full)
    setSuggestEnabled(false)
    setSuggestions([])

    geocodeAddress(full).then((coords) => {
      if (!coords) return
      const [lon, lat] = coords
      panMapTo(lon, lat)
      onGeocode?.(lat, lon)
    })
  }

  // --- Фолбэк для dev/прод без JSMAPS_KEY: статическая карта как раньше ---
  const fallbackMapUrl = (() => {
    if (!mapFailed) return ''
    const [lon, lat] = DEFAULT_CENTER
    const params = new URLSearchParams({
      ll: `${lon},${lat}`, z: '15', l: 'map', lang: 'ru_RU', size: '450,450',
    })
    return `${STATIC_MAP_URL}?${params}`
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Интерактивная карта */}
      {!mapFailed && (
        <div
          ref={mapContainerRef}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--color-background)',
            touchAction: 'none',
            pointerEvents: 'auto',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        />
      )}
      {mapFailed && (
        <img
          src={fallbackMapUrl}
          alt="Карта"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* Затемняющий градиент под UI */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(15,15,17,0.66) 0%, rgba(15,15,17,0.08) 28%, rgba(15,15,17,0.08) 62%, rgba(15,15,17,0.75) 100%)',
      }} />

      {/* Фиксированный центральный пин */}
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <CenterPin />
      </div>

      {/* Верхняя строка: back-кнопка + поиск-пилюля (макет 8794:63351).
          Обёртка пропускает клики на карту, активны только кнопка и инпут.
          back 44×44 (x12), пилюля h44 rx22 (x64, gap 8), оба фон --color-background. */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px',
        flexShrink: 0,
        pointerEvents: 'none',
      }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Назад"
            style={{
              pointerEvents: 'auto',
              width: 44, height: 44, flexShrink: 0,
              borderRadius: '50%',
              background: 'var(--color-background)',
              color: 'var(--color-on-surface-soften)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <BackArrowIcon />
          </button>
        )}
        <div style={{
          flex: 1,
          pointerEvents: 'auto',
          height: 44,
          borderRadius: 22,
          background: 'var(--color-background)',
          display: 'flex', alignItems: 'center',
          padding: '0 16px',
        }}>
          <input
            value={inputValue}
            onChange={(e) => {
              const next = e.target.value
              setInputValue(next)
              if (!next) {
                setSuggestEnabled(false)
                setSuggestions([])
              } else {
                setSuggestEnabled(true)
              }
              // При ручном вводе full === display: пользователь сам знает, что печатает
              lastEmittedFullRef.current = next
              onChange(next)
            }}
            placeholder="Найти адрес"
            style={{
              ...text.body,
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--color-on-surface)',
              padding: 0,
            }}
          />
        </div>
      </div>

      {/* Список подсказок */}
      {suggestions.length > 0 && (
        <div style={{ position: 'relative', zIndex: 3, overflowY: 'auto', minHeight: 0 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
              onClick={() => handleSelect(s)}
              style={{
                width: '100%', background: 'rgba(15,15,17,0.82)', border: 'none',
                padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <LocationIcon />
              <div style={{ flex: 1 }}>
                <div style={{ ...text.body, color: 'var(--color-on-surface)', fontWeight: 500 }}>{s.title}</div>
                {s.subtitle && (
                  <div style={{ ...text.footnote, color: 'var(--color-on-surface-secondary)', marginTop: 2 }}>{s.subtitle}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      {inputValue.trim() && suggestEnabled && suggestions.length === 0 && (
        <div style={{
          position: 'relative', zIndex: 3,
          padding: '18px 16px', textAlign: 'center',
          color: 'var(--color-on-surface-secondary)', ...text.action,
          background: 'rgba(15,15,17,0.82)',
          pointerEvents: 'none',
        }}>
          Ничего не найдено
        </div>
      )}

      {/* Экран инициализации */}
      {!mapReady && !mapFailed && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.55)', ...text.action,
          background: 'rgba(15,15,17,0.35)', pointerEvents: 'none',
        }}>
          Загружаем карту…
        </div>
      )}
    </div>
  )
}

function BackArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12L9.57 18.07" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 12H3.67" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="var(--color-on-surface-secondary)" />
    </svg>
  )
}

function CenterPin() {
  return (
    <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17 1C8.71573 1 2 7.71573 2 16C2 26.25 17 43 17 43C17 43 32 26.25 32 16C32 7.71573 25.2843 1 17 1Z"
        fill="var(--color-primary-surface)" stroke="var(--color-on-primary-surface)" strokeWidth="2" strokeLinejoin="round"
      />
      <circle cx="17" cy="16" r="5" fill="var(--color-on-primary-surface)" />
    </svg>
  )
}
