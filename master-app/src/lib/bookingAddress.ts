export interface BookingAddressDetails {
  floor: string
  apartment: string
  intercom: string
}

export interface DestinationAddressDetails extends BookingAddressDetails {
  entrance: string
}

export interface ParsedBookingAddress extends DestinationAddressDetails {
  address: string
  comment: string
}

const STRUCTURED_ADDRESS_MARKER = 'Дополнительно [CRM4MAX/1]:'

export function formatBookingAddress(address: string, details: BookingAddressDetails & { entrance?: string }, comment: string): string {
  const detailLine = [
    details.entrance?.trim() && `подъезд ${details.entrance.trim()}`,
    details.floor.trim() && `этаж ${details.floor.trim()}`,
    details.apartment.trim() && `кв./офис ${details.apartment.trim()}`,
    details.intercom.trim() && `домофон ${details.intercom.trim()}`,
  ].filter(Boolean).join(', ')

  return [address.trim(), detailLine, comment.trim()].filter(Boolean).join('\n')
}

export function formatBookingAddressNote(details: DestinationAddressDetails, comment: string): string {
  return [
    details.entrance.trim() && `Подъезд: ${details.entrance.trim()}`,
    details.intercom.trim() && `Домофон: ${details.intercom.trim()}`,
    details.floor.trim() && `Этаж: ${details.floor.trim()}`,
    details.apartment.trim() && `Квартира/офис: ${details.apartment.trim()}`,
    comment.trim() && `Комментарий: ${comment.trim()}`,
  ].filter(Boolean).join('\n')
}

export function bookingRouteAddress(value: string): string {
  const firstLine = value.split('\n')[0]?.trim() ?? ''
  return firstLine.replace(/,\s*(?:кв\.\/офис|кв\.?|квартира|офис|подъезд|этаж|домофон)(?:\s|$).*$/i, '').trim()
}

export function parseBookingAddress(value: string, note?: string | null): ParsedBookingAddress {
  const parsedAddress = parseCombinedBookingAddress(value)
  if (note == null) return parsedAddress

  const parsedNote = parseAddressNote(note)
  return { ...parsedAddress, ...parsedNote }
}

function parseCombinedBookingAddress(value: string): ParsedBookingAddress {
  const rawLines = value.split('\n').map((line) => line.trim())
  const addressIndex = rawLines.findIndex(Boolean)
  const addressLine = addressIndex >= 0 ? rawLines[addressIndex]! : ''
  const address = bookingRouteAddress(addressLine)
  const rawBody = addressIndex >= 0 ? rawLines.slice(addressIndex + 1) : []
  const body = rawBody.filter(Boolean)
  if (body[0]?.toLowerCase() === STRUCTURED_ADDRESS_MARKER.toLowerCase()) {
    const markerIndex = rawBody.findIndex((line) => line.toLowerCase() === STRUCTURED_ADDRESS_MARKER.toLowerCase())
    const structuredBody = rawBody.slice(markerIndex + 1)
    const commentIndex = structuredBody.findIndex((line) => /^комментарий\s*:/i.test(line))
    const detailLines = (commentIndex >= 0 ? structuredBody.slice(0, commentIndex) : structuredBody).filter(Boolean)
    const detailKeys = detailLines.map(structuredDetailKey)
    const firstCommentLine = commentIndex >= 0 ? structuredBody[commentIndex]!.replace(/^комментарий\s*:\s*/i, '') : ''
    const comment = [firstCommentLine, ...(commentIndex >= 0 ? structuredBody.slice(commentIndex + 1) : [])].join('\n').trim()
    const hasStructuredFields = detailLines.length > 0 || Boolean(comment)
    const onlyStructuredFields = detailKeys.every(Boolean) && new Set(detailKeys).size === detailKeys.length
    if (hasStructuredFields && onlyStructuredFields) {
      const structuredFloor = labeledValue(detailLines, /^этаж\s*:\s*(.*)$/i)
      const structuredApartment = labeledValue(detailLines, /^(?:квартира\/офис|кв\.\/офис)\s*:\s*(.*)$/i)
      const structuredIntercom = labeledValue(detailLines, /^домофон\s*:\s*(.*)$/i)
      const structuredEntrance = labeledValue(detailLines, /^подъезд\s*:\s*(.*)$/i)
      return {
        address: addressLine,
        entrance: structuredEntrance ?? '',
        floor: structuredFloor ?? '',
        apartment: structuredApartment ?? '',
        intercom: structuredIntercom ?? '',
        comment,
      }
    }
  }

  const inlineDetails = parseLegacyDetails(addressLine)
  const hasInlineDetails = inlineDetails !== null && inlineDetails.firstIndex > 0
  const bodyDetailSource = body[0] ?? ''
  const bodyDetails = parseLegacyDetails(bodyDetailSource)
  const hasBodyDetails = !hasInlineDetails
    && bodyDetails !== null
    && bodyDetails.firstIndex === 0
    && hasUnambiguousLegacyValues(bodyDetails)
  const legacyDetails = hasInlineDetails ? inlineDetails : hasBodyDetails ? bodyDetails : null
  const detailRawIndex = rawBody.findIndex((line) => line === bodyDetailSource)
  const unparsedInlineTail = !hasInlineDetails && address !== addressLine && addressLine.startsWith(address)
    ? addressLine.slice(address.length).replace(/^,\s*/, '').trim()
    : ''
  const commentLines = [
    ...(unparsedInlineTail ? [unparsedInlineTail] : []),
    ...(hasBodyDetails ? rawBody.slice(detailRawIndex + 1) : rawBody),
  ]

  return {
    address,
    entrance: legacyDetails?.entrance ?? '',
    floor: legacyDetails?.floor ?? '',
    apartment: legacyDetails?.apartment ?? '',
    intercom: legacyDetails?.intercom ?? '',
    comment: commentLines.join('\n').trim(),
  }
}

function parseAddressNote(value: string): Omit<ParsedBookingAddress, 'address'> {
  const rawLines = value.split('\n').map((line) => line.trim())
  const commentIndex = rawLines.findIndex((line) => /^комментарий\s*:/i.test(line))
  const detailLines = (commentIndex >= 0 ? rawLines.slice(0, commentIndex) : rawLines).filter(Boolean)
  const detailKeys = detailLines.map(structuredDetailKey)
  const firstCommentLine = commentIndex >= 0 ? rawLines[commentIndex]!.replace(/^комментарий\s*:\s*/i, '') : ''
  const comment = commentIndex >= 0
    ? [firstCommentLine, ...rawLines.slice(commentIndex + 1)].join('\n').trim()
    : ''
  const hasLabeledFields = detailLines.length > 0 && detailKeys.every(Boolean) && new Set(detailKeys).size === detailKeys.length

  if (hasLabeledFields || commentIndex >= 0) {
    return {
      entrance: labeledValue(detailLines, /^подъезд\s*:\s*(.*)$/i) ?? '',
      intercom: labeledValue(detailLines, /^домофон\s*:\s*(.*)$/i) ?? '',
      floor: labeledValue(detailLines, /^этаж\s*:\s*(.*)$/i) ?? '',
      apartment: labeledValue(detailLines, /^(?:квартира\/офис|кв\.\/офис)\s*:\s*(.*)$/i) ?? '',
      comment,
    }
  }

  return { entrance: '', intercom: '', floor: '', apartment: '', comment: value.trim() }
}

function labeledValue(lines: string[], pattern: RegExp): string | undefined {
  const match = lines.map((line) => line.match(pattern)).find(Boolean)
  return match ? (match[1]?.trim() ?? '') : undefined
}

function structuredDetailKey(line: string): keyof DestinationAddressDetails | null {
  const match = line.match(/^(подъезд|этаж|квартира\/офис|кв\.\/офис|домофон)\s*:\s*(.+)$/i)
  if (!match) return null
  if (/^подъезд$/i.test(match[1]!)) return 'entrance'
  if (/^этаж$/i.test(match[1]!)) return 'floor'
  if (/^домофон$/i.test(match[1]!)) return 'intercom'
  return 'apartment'
}

type ParsedLegacyDetails = DestinationAddressDetails & {
  firstIndex: number
}

function parseLegacyDetails(value: string): ParsedLegacyDetails | null {
  const label = 'подъезд|этаж|кв\\.\\/офис|кв\\.?|квартира|офис|домофон'
  const pattern = new RegExp(`(?:^|,\\s*)(${label})\\s+(.+?)(?=,\\s*(?:${label})\\s+|$)`, 'gi')
  const details: DestinationAddressDetails = { entrance: '', floor: '', apartment: '', intercom: '' }
  const seen = new Set<keyof DestinationAddressDetails>()
  let firstIndex = -1
  let match: RegExpExecArray | null
  while ((match = pattern.exec(value)) !== null) {
    const kind: keyof DestinationAddressDetails = /^подъезд$/i.test(match[1]!)
      ? 'entrance'
      : /^этаж$/i.test(match[1]!)
      ? 'floor'
      : /^домофон$/i.test(match[1]!)
        ? 'intercom'
        : 'apartment'
    if (seen.has(kind)) return null
    if (firstIndex < 0) firstIndex = match.index
    seen.add(kind)
    details[kind] = match[2]!.trim()
  }
  return firstIndex >= 0 && seen.size > 0
    ? { ...details, firstIndex }
    : null
}

function hasUnambiguousLegacyValues(details: ParsedLegacyDetails): boolean {
  return (['entrance', 'floor', 'apartment', 'intercom'] as const).every((kind) => {
    const value = details[kind]
    if (!value) return true
    if (kind === 'entrance') return /^(?:№?\s*)?\d+[A-Za-zА-Яа-я0-9\/-]*$/i.test(value)
    if (kind === 'floor') return /^(?:-?\d+(?:-?й|[A-Za-zА-Яа-я])?(?:\s+(?:этаж|уровень))?|(?:нулевой|первый|второй|третий|четв[её]ртый|пятый|шестой|седьмой|восьмой|девятый|десятый)(?:\s+(?:этаж|уровень))?|цоколь(?:ный)?(?:\s+этаж)?|подвал|мансарда)$/i.test(value)
    if (kind === 'apartment') return /^(?:(?:кв\.?|квартира|офис)\s+)?№?\s*\d+[A-Za-zА-Яа-я0-9\/-]*(?:\s+[A-Za-zА-Яа-я])?(?:,\s*(?:корпус|корп\.?|строение|стр\.?)\s+[A-Za-zА-Яа-я0-9\/-]+)?$/i.test(value)
    return /^консьерж$/i.test(value) || (/^(?:код\s+)?[\d#*+\-/\s]+$/i.test(value) && /[\d#*]/.test(value))
  })
}

export function yandexRouteUrl(
  origin: { lat: number | null; lng: number | null; address: string | null },
  destination: string,
): string {
  const from = origin.address?.trim()
    || (origin.lat != null && origin.lng != null ? `${origin.lat},${origin.lng}` : '')
  const params = new URLSearchParams({ mode: 'routes', rtext: `${from}~${destination}`, rtt: 'auto' })
  return `https://yandex.ru/maps/?${params}`
}
