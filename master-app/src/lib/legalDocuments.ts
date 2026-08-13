const DOCUMENTS_BASE_URL = 'https://storage.yandexcloud.net/crm4max-media/docs'

export const OFFER_URL = `${DOCUMENTS_BASE_URL}/%D0%9E%D1%84%D0%B5%D1%80%D1%82%D0%B0.pdf`
export const PERSONAL_DATA_URL = `${DOCUMENTS_BASE_URL}/%D0%9F%D0%BE%D0%BB%D0%B8%D1%82%D0%B8%D0%BA%D0%B0_%D0%BF%D0%B5%D1%80%D1%81%D0%BE%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85_%D0%B4%D0%B0%D0%BD%D0%BD%D1%8B%D1%85.pdf`

export function openLegalDocument(url: string) {
  openMiniAppLink(url)
}
import { openMiniAppLink } from './miniAppHost'
