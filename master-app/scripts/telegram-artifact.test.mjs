import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  MAX_SDK_URL,
  TELEGRAM_SDK_URL,
  hashArtifact,
  inspectBuiltEntrypoints,
  prepareTelegramArtifact,
} from './telegram-artifact.mjs'

const temporaryDirectories = []

async function fixture() {
  const root = join(tmpdir(), `crm4max-telegram-artifact-${crypto.randomUUID()}`)
  const source = join(root, 'dist')
  const output = join(root, 'telegram')
  temporaryDirectories.push(root)
  await mkdir(join(source, 'assets'), { recursive: true })
  await Promise.all([
    writeFile(join(source, 'index.html'), `<script src="${MAX_SDK_URL}"></script><script type="module" src="/assets/max.js"></script>`),
    writeFile(join(source, 'telegram.html'), `<script src="${TELEGRAM_SDK_URL}"></script><script type="module" src="/assets/telegram.js"></script><link rel="stylesheet" href="/assets/app.css">`),
    writeFile(join(source, 'assets/max.js'), 'max'),
    writeFile(join(source, 'assets/telegram.js'), 'telegram'),
    writeFile(join(source, 'assets/app.css'), 'css'),
  ])
  return { source, output }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('Telegram stage artifact', () => {
  it('готовит Telegram root, не изменяя MAX dist', async () => {
    const { source, output } = await fixture()
    const originalMax = await readFile(join(source, 'index.html'), 'utf8')
    const telegram = await readFile(join(source, 'telegram.html'), 'utf8')

    await prepareTelegramArtifact({ sourceDirectory: source, outputDirectory: output })

    expect(await readFile(join(output, 'index.html'), 'utf8')).toBe(telegram)
    expect(await readFile(join(source, 'index.html'), 'utf8')).toBe(originalMax)
    expect(await readFile(join(output, 'assets/telegram.js'), 'utf8')).toBe('telegram')
  })

  it('отклоняет entrypoint с SDK другой платформы', async () => {
    const { source } = await fixture()
    await writeFile(
      join(source, 'telegram.html'),
      `<script src="${TELEGRAM_SDK_URL}"></script><script src="${MAX_SDK_URL}"></script><script type="module" src="/assets/telegram.js"></script>`,
    )

    await expect(inspectBuiltEntrypoints(source)).rejects.toThrow('contains the other provider SDK')
  })

  it('отклоняет отсутствующий referenced asset', async () => {
    const { source } = await fixture()
    await rm(join(source, 'assets/telegram.js'))

    await expect(inspectBuiltEntrypoints(source)).rejects.toThrow('Telegram asset is missing')
  })

  it('даёт одинаковый release hash для одинакового artifact', async () => {
    const first = await fixture()
    const second = await fixture()

    expect(await hashArtifact(first.source)).toBe(await hashArtifact(second.source))
  })

  it('не позволяет удалить source через ancestor output', async () => {
    const { source } = await fixture()

    await expect(prepareTelegramArtifact({ sourceDirectory: source, outputDirectory: join(source, '..') }))
      .rejects.toThrow('outside the source dist directory')
    expect(await readFile(join(source, 'index.html'), 'utf8')).toContain(MAX_SDK_URL)
  })
})
