import { spawnSync } from 'node:child_process'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'

import { hashArtifact, prepareTelegramArtifact } from './telegram-artifact.mjs'

const projectRoot = resolve(import.meta.dirname, '..')
const loadedEnvironment = { ...loadEnv('production', projectRoot, ''), ...process.env }
const requiredVariables = [
  'VITE_YANDEX_SUGGEST_KEY',
  'VITE_YANDEX_GEOCODE_KEY',
  'VITE_YANDEX_JSMAPS_KEY',
]
const missingVariables = requiredVariables.filter((name) => !loadedEnvironment[name]?.trim())

if (missingVariables.length > 0) {
  console.error(`Missing Telegram stage build variables: ${missingVariables.join(', ')}`)
  process.exit(1)
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const build = spawnSync(npmCommand, ['run', 'build'], {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
})
if (build.status !== 0) process.exit(build.status ?? 1)

const artifactRoot = resolve(projectRoot, '.artifacts/telegram-stage')
const temporaryDirectory = resolve(artifactRoot, `.prepare-${process.pid}`)
await rm(temporaryDirectory, { recursive: true, force: true })
await prepareTelegramArtifact({
  sourceDirectory: resolve(projectRoot, 'dist'),
  outputDirectory: temporaryDirectory,
})
const releaseId = await hashArtifact(temporaryDirectory)
const outputDirectory = resolve(artifactRoot, 'releases', releaseId)
await mkdir(resolve(artifactRoot, 'releases'), { recursive: true })
await rm(outputDirectory, { recursive: true, force: true })
await rename(temporaryDirectory, outputDirectory)
await writeFile(resolve(artifactRoot, 'current.json'), `${JSON.stringify({
  schemaVersion: 1,
  releaseId,
  artifactDirectory: outputDirectory,
}, null, 2)}\n`)

console.log(`Telegram stage artifact ready: ${releaseId.slice(0, 16)}`)
