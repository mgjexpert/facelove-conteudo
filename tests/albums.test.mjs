import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildAlbumCatalog } from '../src/catalog/albums.mjs'
import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import { createVercelHandler } from '../api/gateway.mjs'

test('private albums isolate keys, select their nested folders and limit images/videos', async () => {
  const calls = []
  const provider = id => ({ selectedFolderId: id, async listFolder(folder, kind) {
    calls.push([folder, kind])
    return Array.from({ length: kind === 'image' ? 53 : 7 }, (_, index) => ({
      externalId: `${kind}-${index}`, mediaType: kind, mimeType: kind === 'image' ? 'image/jpeg' : 'video/mp4'
    }))
  } })
  const albums = [
    { id: 'images-album', title: 'Fotos', media_type: 'image', visibility: 'access_link' },
    { id: 'videos-album', title: 'Vídeos', media_type: 'video', visibility: 'access_link' }
  ]
  const catalog = await buildAlbumCatalog({ profile: 'emily', albums, providers: {
    'images-album': provider('only-images'), 'videos-album': provider('only-videos')
  } })
  assert.equal(catalog.assets.length, 55)
  assert.deepEqual(catalog.packs.map(pack => pack.assetKeys.length), [50, 5])
  assert.deepEqual(calls, [['only-images', 'image'], ['only-videos', 'video']])
  assert.equal(catalog.assets[0].externalId, 'image-0')
  assert.notEqual(catalog.assets[0].key, catalog.assets[50].key)
})

test('multi-space Vercel catalogue isolates albums and preserves Range seek', async () => {
  const token = 'test-internal-gateway-token-123456789'
  const old = Object.fromEntries(['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','MEDIA_GATEWAY_TOKEN','MEGA_FOLDER_URL'].map(key => [key,process.env[key]]))
  const previousFetch = globalThis.fetch
  process.env.SUPABASE_URL = 'https://db.invalid'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-test-key'
  process.env.MEDIA_GATEWAY_TOKEN = token
  delete process.env.MEGA_FOLDER_URL
  let discovered = 0
  const bytes = Buffer.alloc(2 * 1024 * 1024, 8)
  bytes[1048576] = 42
  globalThis.fetch = async (input, options) => {
    const url = new URL(input)
    if (url.hostname !== 'db.invalid') return previousFetch(input, options)
    const username = url.searchParams.get('username')?.split('.')[1]
    const profileId = url.searchParams.get('profile_id')?.split('.')[1]
    const spaceId = url.searchParams.get('space_id')?.split('.')[1]
    const albumId = url.searchParams.get('album_id')
    const table = url.pathname.split('/').at(-1)
    if (table === 'resolve_login_email') return new Response(JSON.stringify('verified@example.org'), {status:200})
    const data = table === 'profiles' ? [{id:username}] :
      table === 'spaces' ? [{id:`space-${profileId}`}] :
      table === 'albums' ? [{id:`album-${spaceId}`,title:'Fotos',media_type:'image',visibility:'access_link'}] :
      table === 'media_sources' ? [{album_id:albumId.match(/album-[^,)]+/)?.[0],provider:'mega',source_url:'https://mega.nz/folder/AAAAAAAA#BBBBBBBB/folder/XXXXXXXX'}] : []
    return new Response(JSON.stringify(data), {status:200,headers:{'content-type':'application/json'}})
  }
  const provider = () => ({ selectedFolderId:'XXXXXXXX', async listFolder() {
    discovered++
    return [{externalId:'same-source-file',mediaType:'image',mimeType:'image/jpeg'}]
  }, async inspect() {return {size:bytes.length,mimeType:'image/jpeg'}},
  async openReadStream(_asset,{start,end}) {return Readable.from(bytes.subarray(start,end+1))} })
  const server = createServer(createVercelHandler(provider)).listen(0,'127.0.0.1')
  try {
    await new Promise(resolve => server.once('listening',resolve))
    const base = `http://127.0.0.1:${server.address().port}/api/gateway?route=`
    assert.equal((await previousFetch(base+'v1/catalog&space=emily')).status,401)
    assert.equal((await previousFetch(base+'v1/identity&handle=emily')).status,401)
    assert.equal(discovered,0)
    const headers = {Authorization:`Bearer ${token}`}
    const identity = await (await previousFetch(base+'v1/identity&handle=emily',{headers})).json()
    assert.equal(identity.email,'verified@example.org')
    const emily = await (await previousFetch(base+'v1/catalog&space=emily',{headers})).json()
    const jade = await (await previousFetch(base+'v1/catalog&space=jade',{headers})).json()
    assert.equal(emily.profile,'emily')
    assert.notEqual(emily.assets[0].key,jade.assets[0].key)
    assert.equal(JSON.stringify(emily).includes('same-source-file'),false)
    const seek = await previousFetch(base+`v1/media/${emily.assets[0].key}&space=emily`,{
      headers:{...headers,Range:'bytes=1048576-1049599'}
    })
    assert.equal(seek.status,206)
    assert.equal(seek.headers.get('content-range'),`bytes 1048576-1049599/${bytes.length}`)
    assert.equal(new Uint8Array(await seek.arrayBuffer())[0],42)
  } finally {
    server.closeAllConnections(); server.close()
    globalThis.fetch = previousFetch
    for (const [key,value] of Object.entries(old)) if (value === undefined) delete process.env[key]; else process.env[key] = value
  }
})
