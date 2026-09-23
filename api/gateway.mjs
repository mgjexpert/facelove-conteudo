import { timingSafeEqual } from 'node:crypto'
import { createGateway } from '../src/http/gateway.mjs'
import { buildMegaCatalog } from '../src/catalog/mega.mjs'
import { MegaProvider } from '../src/providers/mega.mjs'

const REFRESH_MS = 5 * 60 * 1000

function matchesToken(value, token) {
  if (!token || token.length < 24 || !value) return false
  const a = Buffer.from(value)
  const b = Buffer.from(`Bearer ${token}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function createVercelHandler(providerFactory = folderUrl => new MegaProvider({ folderUrl })) {
  let cached
  let loading

  async function getServer() {
    if (cached && Date.now() < cached.expiresAt) return cached.server
    if (!loading) {
      loading = (async () => {
        const provider = providerFactory(process.env.MEGA_FOLDER_URL)
        const manifest = await buildMegaCatalog(provider)
        if (!manifest.assets.length) throw new Error('Nenhuma imagem ou MP4 na pasta MEGA')
        const server = createGateway({ manifest, token: process.env.MEDIA_GATEWAY_TOKEN, providers: { mega: provider } })
        cached = { server, expiresAt: Date.now() + REFRESH_MS }
        return server
      })().finally(() => { loading = undefined })
    }
    return loading
  }

  // Reuse the same HTTP gateway for Vercel, including stream teardown and Range.
  return async function handler(req, res) {
    const value = req.query?.route || new URL(req.url, 'http://localhost').searchParams.get('route')
    const path = Array.isArray(value) ? '' : value
    if (typeof path !== 'string' || !/^(health|v1\/catalog|v1\/media\/[a-zA-Z0-9_-]+)$/.test(path)) {
      res.writeHead(404, { 'Cache-Control': 'no-store' })
      return res.end()
    }
    if (!process.env.MEGA_FOLDER_URL || !process.env.MEDIA_GATEWAY_TOKEN || process.env.MEDIA_GATEWAY_TOKEN.length < 24) {
      res.writeHead(503, { 'Cache-Control': 'no-store' })
      return res.end('Gateway indisponível')
    }
    if (path === 'health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      return res.end(JSON.stringify({ status: 'ok' }))
    }
    if (!matchesToken(req.headers.authorization, process.env.MEDIA_GATEWAY_TOKEN)) {
      res.writeHead(401, { 'Cache-Control': 'no-store' })
      return res.end('Autorização necessária')
    }
    try {
      const gateway = await getServer()
      req.url = '/' + path
      return await new Promise(resolve => {
        res.once('finish', resolve)
        res.once('close', resolve)
        gateway.emit('request', req, res)
      })
    } catch (error) {
      console.error('Gateway source error:', error.message)
      if (!res.headersSent) {
        res.writeHead(503, { 'Cache-Control': 'no-store' })
        res.end('Gateway indisponível')
      }
    }
  }
}

export default createVercelHandler()
