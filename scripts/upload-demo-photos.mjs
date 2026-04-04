/**
 * upload-demo-photos.mjs
 *
 * Шаг 1 из 2: запускается ЛОКАЛЬНО.
 * Скачивает реальные фото с Unsplash и загружает в Yandex S3.
 * Выводит JSON с S3-URL в stdout для использования в seed-demo-db.mjs.
 *
 * Запуск:
 *   node scripts/upload-demo-photos.mjs
 * (из корня проекта, читает backend/.env автоматически)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

// ─── Читаем backend/.env ──────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dir, '..', 'backend', '.env')
const env = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const S3_BUCKET   = env.S3_BUCKET   ?? 'crm4max-media'
const S3_ENDPOINT = env.S3_ENDPOINT ?? 'https://storage.yandexcloud.net'
const S3_ACCESS   = env.S3_ACCESS_KEY ?? ''
const S3_SECRET   = env.S3_SECRET_KEY ?? ''

const s3 = new S3Client({
  region: 'ru-central1',
  endpoint: S3_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: S3_ACCESS, secretAccessKey: S3_SECRET },
})

function publicUrl(key) {
  return `https://storage.yandexcloud.net/${S3_BUCKET}/${key}`
}

async function uploadFromUrl(srcUrl, folder) {
  process.stderr.write(`  ↑ ${srcUrl.slice(0, 75)}...\n`)
  const res = await fetch(srcUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; crm4max-seed/1.0)' },
    redirect: 'follow',
  })
  if (!res.ok) {
    process.stderr.write(`  ⚠ HTTP ${res.status} — пропускаю\n`)
    return null
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const key = `${folder}/${randomUUID()}.jpg`
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buf,
    ContentType: 'image/jpeg',
  }))
  const url = publicUrl(key)
  process.stderr.write(`  ✓ ${url.slice(0, 75)}\n`)
  return url
}

/** Пробует список URL по очереди, возвращает первый успешный */
async function uploadFirst(urls, folder) {
  for (const u of urls) {
    const result = await uploadFromUrl(u, folder)
    if (result) return result
  }
  throw new Error(`Все URLs недоступны: ${urls[0]}`)
}

/** Загружает до `count` фото из списка, пропускает 404 */
async function uploadMany(urls, folder, count) {
  const results = []
  for (const u of urls) {
    if (results.length >= count) break
    const result = await uploadFromUrl(u, folder)
    if (result) results.push(result)
  }
  return results
}

// ─── Реальные фото с Unsplash (маникюр, педикюр, ногтевой дизайн) ────────────
// Расширенные списки с запасными вариантами на случай 404

const MASTER_CANDIDATES = [
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
]

const MANICURE_CANDIDATES = [
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80',
  'https://images.unsplash.com/photo-1552693673-1bf958298935?w=600&q=80',
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80',
  'https://images.unsplash.com/photo-1604654894575-2ccaae4e6e18?w=600&q=80',
  'https://images.unsplash.com/photo-1604654894637-f4e776fbd2c1?w=600&q=80',
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80',
]

const PEDICURE_CANDIDATES = [
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80',
  'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&q=80',
  'https://images.unsplash.com/photo-1519669556878-63bdecf1301b?w=600&q=80',
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80',
]

const EXTENSIONS_CANDIDATES = [
  'https://images.unsplash.com/photo-1604654894637-f4e776fbd2c1?w=600&q=80',
  'https://images.unsplash.com/photo-1604654894575-2ccaae4e6e18?w=600&q=80',
  'https://images.unsplash.com/photo-1552693673-1bf958298935?w=600&q=80',
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80',
]

const NAILART_CANDIDATES = [
  'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&q=80',
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80',
  'https://images.unsplash.com/photo-1552693673-1bf958298935?w=600&q=80',
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80',
  'https://images.unsplash.com/photo-1604654894637-f4e776fbd2c1?w=600&q=80',
]

async function main() {
  process.stderr.write('\n📸 Загрузка фото в S3...\n\n')

  process.stderr.write('👤 Портрет мастера\n')
  const master = await uploadFirst(MASTER_CANDIDATES, 'avatars')

  process.stderr.write('\n💅 Маникюр (нужно 4)\n')
  const manicure = await uploadMany(MANICURE_CANDIDATES, 'work', 4)

  process.stderr.write('\n🦶 Педикюр (нужно 2)\n')
  const pedicure = await uploadMany(PEDICURE_CANDIDATES, 'work', 2)

  process.stderr.write('\n💎 Наращивание (нужно 2)\n')
  const extensions = await uploadMany(EXTENSIONS_CANDIDATES, 'work', 2)

  process.stderr.write('\n🎨 Дизайн ногтей (нужно 3)\n')
  const nailart = await uploadMany(NAILART_CANDIDATES, 'work', 3)

  process.stderr.write(`\n✅ Загружено: master=1, маникюр=${manicure.length}, педикюр=${pedicure.length}, наращивание=${extensions.length}, дизайн=${nailart.length}\n\n`)

  // JSON в stdout — подхватывается оркестрацией
  console.log(JSON.stringify({ master, manicure, pedicure, extensions, nailart }, null, 2))
}

main().catch(e => { process.stderr.write('❌ ' + e.message + '\n'); process.exit(1) })
