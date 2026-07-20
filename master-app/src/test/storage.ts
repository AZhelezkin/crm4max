export const MASTER_TOKEN = 'master-test-token'
export const CLIENT_TOKEN = 'client-test-token'
export const CLIENT_USER_ID = '00000000-0000-4000-8000-000000000002'

export class MemoryStorage implements Storage {
  readonly #entries = new Map<string, string>()

  get length() {
    return this.#entries.size
  }

  clear() {
    this.#entries.clear()
  }

  getItem(key: string) {
    return this.#entries.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.#entries.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.#entries.delete(key)
  }

  setItem(key: string, value: string) {
    this.#entries.set(key, String(value))
  }
}

export const testLocalStorage = new MemoryStorage()
export const testSessionStorage = new MemoryStorage()

export function installTestStorageGlobals() {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: testLocalStorage,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: testSessionStorage,
  })
}

export function clearTestStorage() {
  testLocalStorage.clear()
  testSessionStorage.clear()
}

export function seedMasterToken(token = MASTER_TOKEN) {
  testLocalStorage.setItem('masterToken', token)
}

export function seedClientCredentials(token = CLIENT_TOKEN, clientId = CLIENT_USER_ID) {
  testLocalStorage.setItem('clientToken', token)
  testLocalStorage.setItem('clientId', clientId)
}

export async function resetApplicationStores() {
  const [{ useAuthStore: useMasterAuthStore }, { useAuthStore: useClientAuthStore }, { useBookingStore }] =
    await Promise.all([
      import('@/store/auth.store'),
      import('@client/store/auth.store'),
      import('@client/store/booking.store'),
    ])

  useMasterAuthStore.setState({ token: null, master: null, isLoading: true })
  useClientAuthStore.setState({ token: null, clientId: null, isLoading: true })
  useBookingStore.setState({
    masterId: '',
    masterProfileLink: null,
    rescheduleId: null,
    service: null,
    categoryName: null,
    date: '',
    time: '',
    slots: [],
    remind: true,
    clientAddress: null,
  })
}
