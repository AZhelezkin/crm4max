import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, parse, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const MAX_SDK_URL = 'https://st.max.ru/js/max-web-app.js'
export const TELEGRAM_SDK_URL = 'https://telegram.org/js/telegram-web-app.js'

function count(source, value) {
  return source.split(value).length - 1
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1] ?? null
}

export function localAssetReferences(html) {
  const references = []
  const tags = html.match(/<(?:script|link)\b[^>]*>/gi) ?? []

  for (const tag of tags) {
    const reference = attribute(tag, tag.toLowerCase().startsWith('<script') ? 'src' : 'href')
    if (!reference || reference.startsWith('data:')) continue
    const url = new URL(reference, 'https://artifact.invalid/')
    if (url.origin !== 'https://artifact.invalid') continue
    references.push(reference)
  }

  return [...new Set(references)]
}

function artifactPath(reference) {
  const pathname = decodeURIComponent(new URL(reference, 'https://artifact.invalid/').pathname)
  const assetsMarker = '/assets/'
  const assetsOffset = pathname.indexOf(assetsMarker)
  const normalized = assetsOffset >= 0
    ? pathname.slice(assetsOffset + 1)
    : pathname.replace(/^\/+/, '')

  if (!normalized || normalized.split('/').includes('..')) {
    throw new Error(`Unsafe local asset reference: ${reference}`)
  }
  return normalized
}

export function assertProviderHtml(html, provider) {
  const ownSdk = provider === 'telegram' ? TELEGRAM_SDK_URL : MAX_SDK_URL
  const otherSdk = provider === 'telegram' ? MAX_SDK_URL : TELEGRAM_SDK_URL
  const moduleTags = (html.match(/<script\b[^>]*type=["']module["'][^>]*>/gi) ?? [])
    .map((tag) => attribute(tag, 'src'))
    .filter(Boolean)

  if (count(html, ownSdk) !== 1) {
    throw new Error(`${provider} entrypoint must contain exactly one provider SDK`)
  }
  if (html.includes(otherSdk)) {
    throw new Error(`${provider} entrypoint contains the other provider SDK`)
  }
  if (moduleTags.length !== 1) {
    throw new Error(`${provider} entrypoint must contain exactly one module script`)
  }
  if (new URL(moduleTags[0], 'https://artifact.invalid/').origin !== 'https://artifact.invalid') {
    throw new Error(`${provider} module entry must be a same-origin asset`)
  }

  return { moduleEntry: moduleTags[0] }
}

async function assertFile(path, label) {
  try {
    if (!(await stat(path)).isFile()) throw new Error('not a file')
  } catch {
    throw new Error(`${label} is missing: ${path}`)
  }
}

export async function inspectBuiltEntrypoints(sourceDirectory) {
  const sourceDir = resolve(sourceDirectory)
  const maxPath = resolve(sourceDir, 'index.html')
  const telegramPath = resolve(sourceDir, 'telegram.html')
  await Promise.all([
    assertFile(maxPath, 'MAX entrypoint'),
    assertFile(telegramPath, 'Telegram entrypoint'),
  ])

  const [maxHtml, telegramHtml] = await Promise.all([
    readFile(maxPath, 'utf8'),
    readFile(telegramPath, 'utf8'),
  ])
  const max = assertProviderHtml(maxHtml, 'max')
  const telegram = assertProviderHtml(telegramHtml, 'telegram')

  for (const [label, html] of [['MAX', maxHtml], ['Telegram', telegramHtml]]) {
    for (const reference of localAssetReferences(html)) {
      await assertFile(resolve(sourceDir, artifactPath(reference)), `${label} asset`)
    }
  }

  if (max.moduleEntry === telegram.moduleEntry) {
    throw new Error('MAX and Telegram entrypoints must use different module entries')
  }

  return { maxHtml, telegramHtml, maxModuleEntry: max.moduleEntry, telegramModuleEntry: telegram.moduleEntry }
}

function assertSafeOutput(sourceDir, outputDir) {
  if (!isAbsolute(sourceDir) || !isAbsolute(outputDir)) throw new Error('Artifact paths must be absolute')
  if (outputDir === parse(outputDir).root || outputDir === resolve(process.cwd())) {
    throw new Error(`Unsafe artifact output directory: ${outputDir}`)
  }
  const outputFromSource = relative(sourceDir, outputDir).replace(/\\/g, '/')
  const sourceFromOutput = relative(outputDir, sourceDir).replace(/\\/g, '/')
  if (
    outputDir === sourceDir
    || outputFromSource.split('/')[0] !== '..'
    || sourceFromOutput.split('/')[0] !== '..'
  ) {
    throw new Error('Telegram artifact output must be outside the source dist directory')
  }
}

export async function prepareTelegramArtifact({ sourceDirectory, outputDirectory }) {
  const sourceDir = resolve(sourceDirectory)
  const outputDir = resolve(outputDirectory)
  assertSafeOutput(sourceDir, outputDir)
  const inspected = await inspectBuiltEntrypoints(sourceDir)

  await rm(outputDir, { recursive: true, force: true })
  await mkdir(dirname(outputDir), { recursive: true })
  await cp(sourceDir, outputDir, { recursive: true })
  await writeFile(resolve(outputDir, 'index.html'), inspected.telegramHtml)

  const preparedRoot = await readFile(resolve(outputDir, 'index.html'), 'utf8')
  if (preparedRoot !== inspected.telegramHtml) {
    throw new Error('Prepared Telegram root differs from telegram.html')
  }
  assertProviderHtml(preparedRoot, 'telegram')
  for (const reference of localAssetReferences(preparedRoot)) {
    await assertFile(resolve(outputDir, artifactPath(reference)), 'Prepared Telegram asset')
  }

  return { outputDirectory: outputDir, moduleEntry: inspected.telegramModuleEntry }
}

export async function hashArtifact(directory) {
  const root = resolve(directory)
  const files = []

  async function collect(current) {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const path = resolve(current, entry.name)
      if (entry.isDirectory()) await collect(path)
      else if (entry.isFile()) files.push(path)
      else throw new Error(`Unsupported artifact entry: ${path}`)
    }
  }

  await collect(root)
  const hash = createHash('sha256')
  for (const path of files) {
    hash.update(relative(root, path).replace(/\\/g, '/'))
    hash.update('\0')
    hash.update(await readFile(path))
    hash.update('\0')
  }
  return hash.digest('hex')
}

function cliArgument(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}

async function main() {
  const hashDirectory = cliArgument('--hash', '')
  if (hashDirectory) {
    process.stdout.write(await hashArtifact(hashDirectory))
    return
  }
  const result = await prepareTelegramArtifact({
    sourceDirectory: cliArgument('--source', 'dist'),
    outputDirectory: cliArgument('--output', '.artifacts/telegram-stage/latest'),
  })
  console.log(`Telegram artifact prepared: ${result.outputDirectory}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
