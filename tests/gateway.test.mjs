import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Readable } from 'node:stream'
import { createGateway } from '../src/http/gateway.mjs'

test('gateway authorizes before provider access and serves 200, 206 seek, HEAD and 416', async () => {
  const bytes = Buffer.alloc(3 * 1024 * 1024, 7)
  bytes[1048576] = 42
  let opened = 0
  const provider = {
    async inspect() { return { size: bytes.length, mimeType: 'video/mp4' } },
    async openReadStream(_asset, { start, end }) { opened++; return Readable.from(bytes.subarray(start, end + 1)) }
  }
  const token = 'test-only-token-of-sufficient-length'
  const server = createGateway({
    token, providers: { fake: provider },
    manifest: { schemaVersion: '1.0', profile: 'anaoliveira', assets: [
      { key: 'ana-video-001', provider: 'fake', externalId: 'private-node', mediaType: 'video', visibility: 'public' }
    ] }
  }).listen(0, '127.0.0.1')
  try {
    await new Promise(resolve => server.once('listening', resolve))
    const base = `http://127.0.0.1:${server.address().port}`
    const unauthorized = await fetch(base + '/v1/media/ana-video-001')
    assert.equal(unauthorized.status, 401)
    assert.equal(opened, 0)
    const headers = { Authorization: `Bearer ${token}` }
    const catalog = await (await fetch(base + '/v1/catalog', { headers })).json()
    assert.equal(catalog.assets[0].externalId, undefined)
    const full = await fetch(base + '/v1/media/ana-video-001', { headers })
    assert.equal(full.status, 200)
    assert.equal((await full.arrayBuffer()).byteLength, bytes.length)
    const head = await fetch(base + '/v1/media/ana-video-001', { method: 'HEAD', headers })
    assert.equal(head.status, 200)
    assert.equal(head.headers.get('accept-ranges'), 'bytes')
    const seek = await fetch(base + '/v1/media/ana-video-001', { headers: { ...headers, Range: 'bytes=1048576-1052671' } })
    assert.equal(seek.status, 206)
    assert.equal(seek.headers.get('content-range'), `bytes 1048576-1052671/${bytes.length}`)
    assert.equal(new Uint8Array(await seek.arrayBuffer())[0], 42)
    const invalid = await fetch(base + '/v1/media/ana-video-001', { headers: { ...headers, Range: 'bytes=999999999-' } })
    assert.equal(invalid.status, 416)
    assert.equal(invalid.headers.get('content-range'), `bytes */${bytes.length}`)
    const missing = await fetch(base + '/v1/media/unknown', { headers })
    assert.equal(missing.status, 404)
  } finally { server.closeAllConnections(); server.close() }
})
