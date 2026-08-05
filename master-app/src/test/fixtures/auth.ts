export const MASTER_ID = '10000000-0000-4000-8000-000000000001'
export const CLIENT_ID = '20000000-0000-4000-8000-000000000002'
export const MASTER_CLIENT_ID = '30000000-0000-4000-8000-000000000003'
export const SERVICE_ID = '40000000-0000-4000-8000-000000000004'
export const BOOKING_ID = '50000000-0000-4000-8000-000000000005'
export const PACKAGE_ID = '60000000-0000-4000-8000-000000000006'
export const PAYMENT_ID = '70000000-0000-4000-8000-000000000007'
export const REVIEW_ID = '80000000-0000-4000-8000-000000000008'
export const MASTER_TOKEN = 'master.fixture.token'
export const CLIENT_TOKEN = 'client.fixture.token'
export const MAX_INIT_DATA = 'signed-fixture-init-data'
export const ANALYTICS_USER_ID = 'opaque-analytics-user-id'

export const masterAuthResponse = {
  token: MASTER_TOKEN,
  userId: MASTER_ID,
  role: 'master',
  analyticsUserId: ANALYTICS_USER_ID,
}

export const clientAuthResponse = {
  token: CLIENT_TOKEN,
  userId: CLIENT_ID,
  role: 'client',
  analyticsUserId: ANALYTICS_USER_ID,
}
