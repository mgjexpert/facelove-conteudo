import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import handler from '../api/gateway.mjs'

test('Vercel Function reuses the authorized gateway and sanitized pack catalogue', async () => {
  const manifest = {
    schemaVersion: '1.0', profile: 'anaoliveira',
    assets: [{ key: 'private-video-001', provider: 'mega', externalId: 'server-only-id', mediaType: 'video', visibility: 'access_link', packId: 'videos-001' }],
    packs: [{ id: 'videos-001', title: 'Pack de teste', mediaType: 'video', assetKeys: ['private-video-001'] }]
  }
  process.env.MEDIA_MANIFEST_BASE64 = Buffer.from(JSON.stringify(manifest)).toString('base64')
  process.env.MEGA_FOLDER_URL = 'https://mega.nz/folder/AAAAAAAA#BBBBBBBB'
  process.env.MEDIA_GATEWAY_TOKEN = 'test-only-token-of-sufficient-length'
  const server = createServer(handler).listen(0, '127.0.0.1')
  try {
    await new Promise(resolve => server.once('listening', resolve))
    const base = `http://127.0.0.1:${server.address().port}`
    const unauthorized = await fetch(base + '/api/gateway?route=v1/catalog')
    assert.equal(unauthorized.status, 401)
    const response = await fetch(base + '/api/gateway?route=v1/catalog', {
      headers: { Authorization: `Bearer ${process.env.MEDIA_GATEWAY_TOKEN}` }
    })
    assert.equal(response.status, 200)
    const catalog = await response.json()
    assert.equal(catalog.assets[0].externalId, undefined)
    assert.equal(catalog.packs[0].assetKeys[0], 'private-video-001')
    const invalid = await fetch(base + '/api/gateway?route=arbitrary')
    assert.equal(invalid.status, 404)
  } finally {
    server.closeAllConnections()
    server.close()
    delete process.env.MEDIA_MANIFEST_BASE64
    delete process.env.MEGA_FOLDER_URL
    delete process.env.MEDIA_GATEWAY_TOKEN
  }
})
