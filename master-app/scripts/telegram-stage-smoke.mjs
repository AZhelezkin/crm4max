import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  assertProviderHtml,
  localAssetReferences,
} from './telegram-artifact.mjs'

const DEFAULT_TIMEOUT_MS = 15_000

function assertHttpsOrigin(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Stage URL must be an HTTPS origin without credentials, path, query, or fragment')
  }
  return url
}

async function request(fetchImpl, input, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal, redirect: 'error' })
  } finally {
    clearTimeout(timeout)
  }
}

async function responseText(response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

async function assertApiRouting(baseUrl, fetchImpl, timeoutMs) {
  const response = await request(fetchImpl, new URL('/api/masters/me', baseUrl), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isOnboarded: true }),
  }, timeoutMs)
  const contentType = response.headers.get('content-type') ?? ''
  const body = await responseText(response)

  if (response.status !== 401) {
    throw new Error(`API routing probe expected 401, received ${response.status}`)
  }
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`API routing probe expected JSON, received ${contentType || 'unknown content type'}`)
  }
  let payload
  try {
    payload = JSON.parse(body)
  } catch {
    throw new Error('API routing probe returned invalid JSON')
  }
  if (payload?.error !== 'Unauthorized') {
    throw new Error('API routing probe did not reach the backend auth boundary')
  }
}

async function assertSpaRouting(baseUrl, fetchImpl, timeoutMs) {
  const probeUrl = new URL(`/__crm4max_spa_route_probe__?v=${Date.now()}`, baseUrl)
  const response = await request(fetchImpl, probeUrl, {}, timeoutMs)
  const contentType = response.headers.get('content-type') ?? ''

  if (response.status !== 200) {
    throw new Error(`SPA routing probe expected 200, received ${response.status}`)
  }
  if (!contentType.toLowerCase().includes('text/html')) {
    throw new Error(`SPA routing probe expected HTML, received ${contentType || 'unknown content type'}`)
  }
  await responseText(response)
}

async function assertPublishedArtifact(baseUrl, releaseId, fetchImpl, timeoutMs) {
  if (!/^[a-f0-9]{16,64}$/.test(releaseId)) {
    throw new Error('Release ID must be a hexadecimal artifact hash')
  }
  const rootUrl = new URL(`/?v=${releaseId}`, baseUrl)
  const rootResponse = await request(fetchImpl, rootUrl, {}, timeoutMs)
  const contentType = rootResponse.headers.get('content-type') ?? ''
  const html = await responseText(rootResponse)

  if (rootResponse.status !== 200) {
    throw new Error(`Telegram root expected 200, received ${rootResponse.status}`)
  }
  if (!contentType.toLowerCase().includes('text/html')) {
    throw new Error(`Telegram root expected HTML, received ${contentType || 'unknown content type'}`)
  }
  assertProviderHtml(html, 'telegram')

  const assetUrls = localAssetReferences(html).map((reference) => new URL(reference, rootUrl))
  if (assetUrls.length === 0) throw new Error('Telegram root does not reference any same-origin assets')

  for (const assetUrl of assetUrls) {
    if (assetUrl.origin !== baseUrl.origin) {
      throw new Error(`Telegram root references unexpected asset origin: ${assetUrl.origin}`)
    }
    const response = await request(fetchImpl, assetUrl, {}, timeoutMs)
    if (response.status !== 200) {
      throw new Error(`Telegram asset ${assetUrl.pathname} expected 200, received ${response.status}`)
    }
    await response.body?.cancel?.()
  }
}

export async function smokeTelegramStage({
  baseUrl,
  releaseId,
  routingOnly = false,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const origin = assertHttpsOrigin(baseUrl)
  await assertApiRouting(origin, fetchImpl, timeoutMs)
  if (routingOnly) await assertSpaRouting(origin, fetchImpl, timeoutMs)
  else await assertPublishedArtifact(origin, releaseId, fetchImpl, timeoutMs)
  return { routingOnly, releaseId: routingOnly ? null : releaseId }
}

function argument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const routingOnly = process.argv.includes('--routing-only')
  const baseUrl = argument('--url') ?? process.env.TELEGRAM_STAGE_URL ?? 'https://tg.stage.soldatov.dev'
  const releaseId = argument('--release') ?? process.env.TELEGRAM_STAGE_RELEASE_ID ?? ''
  await smokeTelegramStage({ baseUrl, releaseId, routingOnly })
  console.log(routingOnly ? 'Telegram stage routing smoke passed' : `Telegram stage smoke passed: ${releaseId.slice(0, 16)}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
