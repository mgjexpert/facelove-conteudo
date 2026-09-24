import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import { createVercelHandler } from '../api/gateway.mjs'

const space = '11111111-1111-4111-8111-111111111111'
const token = 'test-gateway-invitation-token-123456789'

test('private Space invitations require backend authentication and enforce active windows', async () => {
  const originalFetch = globalThis.fetch
  const old = Object.fromEntries(['SUPABASE_URL','SUPABASE_SECRET_KEY','MEDIA_GATEWAY_TOKEN'].map(key => [key,process.env[key]]))
  process.env.SUPABASE_URL = 'https://db.invalid'
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test-only'
  process.env.MEDIA_GATEWAY_TOKEN = token
  const created = []
  let revoked = false
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input)
    if (url.hostname !== 'db.invalid') return originalFetch(input, options)
    const table = url.pathname.split('/').at(-1)
    if (table === 'spaces') return new Response(JSON.stringify([{id:space}]),{status:200})
    if (table === 'access_links' && options.method === 'POST') {
      created.push(JSON.parse(options.body));return new Response('',{status:201})
    }
    if (table === 'access_links' && options.method === 'PATCH') {
      assert.equal(url.searchParams.get('space_id'), `eq.${space}`)
      revoked = true;return new Response(JSON.stringify([{id:created[0].id || 'test'}]),{status:200})
    }
    if (table === 'access_links' && url.searchParams.has('token_hash')) return new Response(JSON.stringify([{
      album_id:null,space_id:space,tier:'guest',image_limit:30,video_limit:10,
      expires_at:null,duration_seconds:300,activated_at:new Date(Date.now()-6*60_000).toISOString(),
      max_uses:1,uses_count:1,revoked_at:null
    }]),{status:200})
    if (table === 'access_links') return new Response(JSON.stringify([{id:'test',space_id:space,tier:'guest',image_limit:30,video_limit:10,token_hash:undefined}]),{status:200})
    return new Response('[]',{status:200})
  }
  const server = createServer(createVercelHandler()).listen(0,'127.0.0.1')
  try {
    await new Promise(resolve => server.once('listening',resolve))
    const base = `http://127.0.0.1:${server.address().port}/api/gateway?route=`
    assert.equal((await originalFetch(`${base}v1/invites&space=${space}`)).status,401)
    const headers = { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }
    const issued = await originalFetch(`${base}v1/invites&space=${space}`,{method:'POST',headers,
      body:JSON.stringify({ tier:'guest',duration:'5m',maxUses:1,label:'Visita de cortesia' })})
    assert.equal(issued.status,201)
    const { token: invitation } = await issued.json()
    assert.match(invitation,/^[a-zA-Z0-9_-]{32,}$/)
    assert.equal(created[0].token_hash.length,64)
    assert.equal(created[0].image_limit,30)
    assert.equal(created[0].video_limit,10)
    assert.equal(created[0].duration_seconds,300)
    assert.equal(created[0].max_uses,1)
    assert.equal(JSON.stringify(created).includes(invitation),false)
    const list = await (await originalFetch(`${base}v1/invites&space=${space}`,{headers})).json()
    assert.equal(list.length,1)
    assert.equal(JSON.stringify(list).includes('token_hash'),false)
    const expired = await (await originalFetch(`${base}v1/access&hash=${'a'.repeat(64)}`,{headers})).json()
    assert.equal(expired.active,false)
    assert.equal(expired.available,false)
    assert.equal(expired.spaceId,space)
    assert.equal((await originalFetch(`${base}v1/access&hash=${'a'.repeat(64)}`,{method:'POST',headers})).status,403)
    assert.equal((await originalFetch(`${base}v1/invites/revoke&space=${space}`,{method:'POST',headers,body:JSON.stringify({id:space})})).status,200)
    assert.equal(revoked,true)
  } finally {
    server.closeAllConnections();server.close()
    globalThis.fetch = originalFetch
    for (const [key,value] of Object.entries(old)) if (value === undefined) delete process.env[key]; else process.env[key] = value
  }
})
