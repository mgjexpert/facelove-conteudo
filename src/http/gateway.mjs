import http from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { resolveByteRange } from './range.mjs'

function constantTimeEqual(a, b) {
  if (!a || !b) return false
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  })
  res.end(JSON.stringify(payload))
}
function publicMetadata(asset) {
  const { key, mediaType, mimeType, title, caption, visibility, thumbnailReference } = asset
  return { key, mediaType, mimeType, title, caption, visibility, thumbnailReference }
}

export function createGateway({ manifest, providers, token }) {
  if (!token || token.length < 24) throw new Error('MEDIA_GATEWAY_TOKEN deve ter pelo menos 24 caracteres')
  const assets = new Map(manifest.assets.map(asset => [asset.key, asset]))
  return http.createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname
      if (path === '/health') return json(res, 200, { status: 'ok' })
      if (!constantTimeEqual(req.headers.authorization, `Bearer ${token}`)) {
        return json(res, 401, { error: 'Autorização necessária' })
      }
      if (path === '/v1/catalog' && req.method === 'GET') {
        return json(res, 200, { schemaVersion: manifest.schemaVersion, profile: manifest.profile, assets: manifest.assets.map(publicMetadata) })
      }
      if (path.startsWith('/v1/media/') && ['GET', 'HEAD'].includes(req.method)) {
        let key
        try { key = decodeURIComponent(path.slice('/v1/media/'.length)) } catch { return json(res, 400, { error: 'ID inválido' }) }
        const asset = assets.get(key)
        if (!asset) return json(res, 404, { error: 'Asset não encontrado' })
        const provider = providers[asset.provider]
        if (!provider) return json(res, 503, { error: 'Provider não configurado' })
        const metadata = await provider.inspect(asset)
        if (!metadata) return json(res, 404, { error: 'Ficheiro não encontrado na origem' })
        const range = resolveByteRange(req.headers.range, metadata.size)
        if (!range) {
          res.writeHead(416, {
            'Content-Range': `bytes */${metadata.size}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-store'
          })
          return res.end()
        }
        const headers = {
          'Content-Type': metadata.mimeType,
          'Content-Length': Math.max(0, range.end - range.start + 1),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff'
        }
        if (range.status === 206) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${metadata.size}`
        if (req.method === 'HEAD' || metadata.size === 0) {
          res.writeHead(range.status, headers)
          return res.end()
        }
        const stream = await provider.openReadStream(asset, range)
        stream.once('error', error => {
          console.error('Media stream error:', error.message)
          if (!res.headersSent) json(res, 502, { error: 'Falha ao ler media' })
          else res.destroy(error)
        })
        res.on('close', () => stream.destroy())
        res.writeHead(range.status, headers)
        stream.pipe(res)
        return
      }
      return json(res, 404, { error: 'Rota não encontrada' })
    } catch (error) {
      console.error('Gateway error:', error.message)
      if (!res.headersSent) json(res, 503, { error: 'Provider indisponível' })
      else res.destroy(error)
    }
  })
}
