import { timingSafeEqual } from 'node:crypto'
import { createGateway } from '../src/http/gateway.mjs'
import { buildMegaCatalog } from '../src/catalog/mega.mjs'
import { MegaProvider } from '../src/providers/mega.mjs'
import { buildAlbumCatalog } from '../src/catalog/albums.mjs'

const REFRESH_MS = 5 * 60 * 1000

function matchesToken(value, token) {
  if (!token || token.length < 24 || !value) return false
  const a = Buffer.from(value)
  const b = Buffer.from(`Bearer ${token}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function createVercelHandler(providerFactory = folderUrl => new MegaProvider({ folderUrl })) {
  const cache = new Map()
  const loading = new Map()

  async function dbRows(table, query) {
    const base = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!base || !key) throw new Error('Catálogo Supabase não configurado')
    const url = new URL(`/rest/v1/${table}?${query}`, base)
    const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' })
    if (!response.ok) throw new Error('Falha na consulta do catálogo')
    return response.json()
  }

  async function accessRequest(req, res) {
    const hash = new URL(req.url, 'http://localhost').searchParams.get('hash')
    if (!hash || !/^[a-f0-9]{64}$/.test(hash)) { res.writeHead(400); return res.end() }
    const links = await dbRows('access_links', `token_hash=eq.${hash}&select=id,album_id,expires_at,max_uses,uses_count,revoked_at`)
    const link = links[0]
    if (!link) { res.writeHead(404); return res.end() }
    const active = !link.revoked_at && (!link.expires_at || Date.parse(link.expires_at) > Date.now())
    const available = active && (link.max_uses === null || link.uses_count < link.max_uses)
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      return res.end(JSON.stringify({ albumId: link.album_id, expiresAt: link.expires_at, active, available }))
    }
    if (req.method !== 'POST' || !available) { res.writeHead(403); return res.end() }
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const response = await fetch(new URL('/rest/v1/rpc/redeem_space_link', process.env.SUPABASE_URL), {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_hash: hash }), cache: 'no-store'
    })
    if (!response.ok) throw new Error('Falha na ativação do convite')
    const redeemed = await response.json()
    if (!redeemed.length) { res.writeHead(403); return res.end() }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    return res.end(JSON.stringify({ albumId: link.album_id, expiresAt: link.expires_at }))
  }

  async function identityRequest(req, res) {
    if (req.method !== 'GET') { res.writeHead(405); return res.end() }
    const handle = new URL(req.url, 'http://localhost').searchParams.get('handle') || ''
    if (!/^[a-z0-9_]{3,32}$/.test(handle)) { res.writeHead(400); return res.end() }
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key || !process.env.SUPABASE_URL) { res.writeHead(503); return res.end() }
    const response = await fetch(new URL('/rest/v1/rpc/resolve_login_email', process.env.SUPABASE_URL), {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_username: handle }), cache: 'no-store'
    })
    if (!response.ok) throw new Error('Falha ao verificar identidade')
    const email = await response.json()
    res.writeHead(200, { 'Content-Type':'application/json', 'Cache-Control':'no-store' })
    return res.end(JSON.stringify({ email: typeof email === 'string' ? email : null }))
  }

  async function loadSpace(space) {
    const profiles = await dbRows('profiles', `username=eq.${space}&select=id`)
    if (profiles.length !== 1) throw new Error('Space desconhecido')
    const spaces = await dbRows('spaces', `profile_id=eq.${profiles[0].id}&status=eq.published&select=id`)
    if (spaces.length !== 1) throw new Error('Space indisponível')
    const albums = await dbRows('albums', `space_id=eq.${spaces[0].id}&select=id,title,media_type,visibility,sort_order&order=sort_order.asc`)
    const sources = await dbRows('media_sources', `album_id=in.(${albums.map(a => a.id).join(',')})&select=album_id,provider,source_url`)
    const byAlbum = new Map(sources.map(source => [source.album_id, source]))
    const providers = {}
    const active = albums.filter(album => byAlbum.has(album.id))
    for (const album of active) {
      const source = byAlbum.get(album.id)
      if (source.provider !== 'mega') continue // Drive adapter needs separate provider credentials and validation.
      providers[album.id] = providerFactory(source.source_url)
    }
    const ready = active.filter(album => providers[album.id])
    const manifest = await buildAlbumCatalog({ profile: space, albums: ready, providers })
    return createGateway({ manifest, providers, token: process.env.MEDIA_GATEWAY_TOKEN })
  }

  async function getServer(space) {
    const cached = cache.get(space)
    if (cached && Date.now() < cached.expiresAt) return cached.server
    if (!loading.has(space)) {
      loading.set(space, (async () => {
        let server
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) server = await loadSpace(space)
        else {
          if (space !== 'anaoliveira') throw new Error('Space indisponível')
          const provider = providerFactory(process.env.MEGA_FOLDER_URL)
          const manifest = await buildMegaCatalog(provider)
          server = createGateway({ manifest, token: process.env.MEDIA_GATEWAY_TOKEN, providers: { mega: provider } })
        }
        cache.set(space, { server, expiresAt: Date.now() + REFRESH_MS })
        return server
      })().finally(() => { loading.delete(space) }))
    }
    return loading.get(space)
  }

  // Reuse the same HTTP gateway for Vercel, including stream teardown and Range.
  return async function handler(req, res) {
    const value = req.query?.route || new URL(req.url, 'http://localhost').searchParams.get('route')
    const path = Array.isArray(value) ? '' : value
    if (typeof path !== 'string' || !/^(health|v1\/catalog|v1\/access|v1\/identity|v1\/media\/[a-zA-Z0-9_-]+)$/.test(path)) {
      res.writeHead(404, { 'Cache-Control': 'no-store' })
      return res.end()
    }
    const dbConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    if ((!dbConfigured && !process.env.MEGA_FOLDER_URL) || !process.env.MEDIA_GATEWAY_TOKEN || process.env.MEDIA_GATEWAY_TOKEN.length < 24) {
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
      if (path === 'v1/access') return await accessRequest(req, res)
      if (path === 'v1/identity') return await identityRequest(req, res)
      const space = new URL(req.url, 'http://localhost').searchParams.get('space') || 'anaoliveira'
      if (!/^[a-z0-9_]{3,32}$/.test(space)) { res.writeHead(400); return res.end() }
      const gateway = await getServer(space)
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
