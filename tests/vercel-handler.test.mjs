import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import { createVercelHandler } from '../api/gateway.mjs'
import { buildMegaCatalog } from '../src/catalog/mega.mjs'

test('direct folder builds private 50+5 packs with stable keys without leaking origin IDs', async () => {
  const images = Array.from({ length: 53 }, (_, i) => ({ externalId: `private-image-${i}`, mimeType: 'image/jpeg' }))
  const videos = Array.from({ length: 7 }, (_, i) => ({ externalId: `private-video-${i}`, mimeType: 'video/mp4' }))
  const provider = { listMedia: async kind => kind === 'image' ? images : videos }
  const catalog = await buildMegaCatalog(provider)
  assert.equal(catalog.assets.length, 55)
  assert.deepEqual(catalog.packs.map(pack => pack.assetKeys.length), [50, 5])
  assert.ok(catalog.assets.every(asset => asset.visibility === 'access_link' && !asset.key.includes('private-')))
  const reordered = await buildMegaCatalog({ listMedia: async kind => kind === 'image' ? [images[1], images[0], ...images.slice(2)] : videos })
  assert.equal(reordered.assets[0].key, catalog.assets[1].key)
})

test('Vercel gateway checks authorization before MEGA, streams Range and hides origin IDs', async () => {
  const bytes = Buffer.alloc(2 * 1024 * 1024, 7)
  bytes[1048576] = 42
  let discovered = 0
  const provider = {
    async listMedia(type) {
      discovered++
      return type === 'video' ? [{ externalId: 'private-node-id', mimeType: 'video/mp4' }] : []
    },
    async inspect() { return { size: bytes.length, mimeType: 'video/mp4' } },
    async openReadStream(_asset, { start, end }) { return Readable.from(bytes.subarray(start, end + 1)) }
  }
  const previous = Object.fromEntries(['MEGA_FOLDER_URL', 'MEDIA_GATEWAY_TOKEN'].map(key => [key, process.env[key]]))
  process.env.MEGA_FOLDER_URL = 'https://mega.nz/folder/AAAAAAAA#BBBBBBBB'
  process.env.MEDIA_GATEWAY_TOKEN = 'test-only-token-of-sufficient-length'
  const server = createServer(createVercelHandler(() => provider)).listen(0, '127.0.0.1')
  try {
    await new Promise(resolve => server.once('listening', resolve))
    const base = `http://127.0.0.1:${server.address().port}/api/gateway?route=`
    assert.equal((await fetch(base + 'health')).status, 200)
    assert.equal((await fetch(base + 'v1/catalog')).status, 401)
    assert.equal(discovered, 0)
    const headers = { Authorization: `Bearer ${process.env.MEDIA_GATEWAY_TOKEN}` }
    const catalog = await (await fetch(base + 'v1/catalog', { headers })).json()
    assert.equal(catalog.assets.length, 1)
    assert.equal(catalog.assets[0].externalId, undefined)
    assert.equal(catalog.packs[0].assetKeys.length, 1)
    assert.equal(discovered, 2)
    const key = catalog.assets[0].key
    const head = await fetch(base + `v1/media/${key}`, { headers, method: 'HEAD' })
    assert.equal(head.status, 200)
    const seek = await fetch(base + `v1/media/${key}`, { headers: { ...headers, Range: 'bytes=1048576-1052671' } })
    assert.equal(seek.status, 206)
    assert.equal(seek.headers.get('content-range'), `bytes 1048576-1052671/${bytes.length}`)
    assert.equal(new Uint8Array(await seek.arrayBuffer())[0], 42)
    const invalid = await fetch(base + `v1/media/${key}`, { headers: { ...headers, Range: 'bytes=999999999-' } })
    assert.equal(invalid.status, 416)
    assert.equal((await fetch(base + 'anything', { headers })).status, 404)
  } finally {
    server.closeAllConnections()
    server.close()
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
