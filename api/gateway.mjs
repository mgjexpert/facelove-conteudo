import { createGateway } from '../src/http/gateway.mjs'
import { MegaProvider } from '../src/providers/mega.mjs'
import { GoogleDriveProvider } from '../src/providers/google-drive.mjs'

let server

function getServer() {
  if (server) return server
  const encoded = process.env.MEDIA_MANIFEST_BASE64
  if (!encoded || !process.env.MEGA_FOLDER_URL || !process.env.MEDIA_GATEWAY_TOKEN) {
    throw new Error('Configure MEDIA_MANIFEST_BASE64, MEGA_FOLDER_URL e MEDIA_GATEWAY_TOKEN')
  }
  const manifest = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))
  if (manifest.schemaVersion !== '1.0' || !Array.isArray(manifest.assets) || !Array.isArray(manifest.packs)) {
    throw new Error('Manifest inválido')
  }
  server = createGateway({
    manifest,
    token: process.env.MEDIA_GATEWAY_TOKEN,
    providers: {
      mega: new MegaProvider({ folderUrl: process.env.MEGA_FOLDER_URL }),
      google_drive: new GoogleDriveProvider()
    }
  })
  return server
}

// Vercel rewrites the public paths to this Function. The same Node gateway
// handles local and serverless traffic, including Range and stream teardown.
export default function handler(req, res) {
  const value = req.query?.route || new URL(req.url, 'http://localhost').searchParams.get('route')
  const path = Array.isArray(value) ? '' : value
  if (typeof path !== 'string' || !/^(health|v1\/catalog|v1\/media\/[a-zA-Z0-9_-]+)$/.test(path)) {
    res.writeHead(404, { 'Cache-Control': 'no-store' })
    return res.end()
  }
  try {
    const gateway = getServer()
    req.url = '/' + path
    return new Promise(resolve => {
      res.once('finish', resolve)
      res.once('close', resolve)
      gateway.emit('request', req, res)
    })
  } catch (error) {
    console.error('Gateway configuration error:', error.message)
    res.writeHead(503, { 'Cache-Control': 'no-store' })
    res.end('Gateway indisponível')
  }
}
