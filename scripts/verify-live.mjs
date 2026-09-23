import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const token = process.env.MEDIA_GATEWAY_TOKEN
if (!token) throw new Error('Defina MEDIA_GATEWAY_TOKEN para validar o gateway.')
const manifest = JSON.parse(await readFile('.private/ana-oliveira.manifest.json', 'utf8'))
const photo = manifest.assets.find(item => item.mediaType === 'image')
const video = manifest.assets.find(item => item.mediaType === 'video')
const port = String(32000 + Math.floor(Math.random() * 20000))
const child = spawn(process.execPath, ['src/server.mjs'], {
  env: { ...process.env, MEDIA_GATEWAY_PORT: port },
  stdio: ['ignore', 'pipe', 'inherit']
})
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Gateway não iniciou')), 8000)
    child.stdout.on('data', data => {
      if (String(data).includes('Media gateway em')) { clearTimeout(timer); resolve() }
    })
    child.once('exit', code => { clearTimeout(timer); reject(Error(`Gateway terminou: ${code}`)) })
  })
  const base = `http://127.0.0.1:${port}`
  const auth = { Authorization: `Bearer ${token}` }
  const catalog = await fetch(base + '/v1/catalog', { headers: auth })
  assert.equal(catalog.status, 200)
  assert.equal((await catalog.json()).assets[0].externalId, undefined)
  const image = await fetch(base + '/v1/media/' + photo.key, { headers: auth, signal: AbortSignal.timeout(60000) })
  assert.equal(image.status, 200)
  const imageBytes = (await image.arrayBuffer()).byteLength
  assert(imageBytes > 100)
  const noRange = await fetch(base + '/v1/media/' + video.key, { method: 'HEAD', headers: auth, signal: AbortSignal.timeout(60000) })
  assert.equal(noRange.status, 200)
  assert.equal(noRange.headers.get('accept-ranges'), 'bytes')
  const range = await fetch(base + '/v1/media/' + video.key, {
    headers: { ...auth, Range: 'bytes=1048576-1052671' }, signal: AbortSignal.timeout(60000)
  })
  assert.equal(range.status, 206)
  assert.equal((await range.arrayBuffer()).byteLength, 4096)
  assert(range.headers.get('content-range').startsWith('bytes 1048576-1052671/'))
  const invalid = await fetch(base + '/v1/media/' + video.key, {
    headers: { ...auth, Range: 'bytes=999999999999-' }, signal: AbortSignal.timeout(60000)
  })
  assert.equal(invalid.status, 416)
  console.log(JSON.stringify({ imageStatus: 200, imageBytes, videoHead: 200, seekStatus: 206, seekBytes: 4096, invalidRange: 416 }, null, 2))
} finally { child.kill('SIGTERM') }
