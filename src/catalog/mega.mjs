import { createHash } from 'node:crypto'

// The source reference stays on the gateway. Only publicMetadata in the HTTP
// layer may serialize these assets to the frontend.
export async function buildMegaCatalog(provider, profile = 'anaoliveira') {
  if (!/^[a-z0-9_-]{1,40}$/.test(profile)) throw new Error('Space inválido')
  const keyFor = (type, id) => `mega-${type}-${createHash('sha256').update(`${profile}\0${id}`).digest('hex').slice(0, 20)}`
  const photoPack = `${profile}-photos-001`
  const videoPack = `${profile}-videos-001`
  const [photos, videos] = await Promise.all([
    provider.listMedia('image'),
    provider.listMedia('video')
  ])
  const selectedPhotos = photos.slice(0, 50)
  const selectedVideos = videos.filter(file => file.mimeType === 'video/mp4').slice(0, 5)
  const assets = [
    ...selectedPhotos.map((file, index) => ({
      key: keyFor('img', file.externalId),
      provider: 'mega', externalId: file.externalId, mediaType: 'image', mimeType: file.mimeType,
      title: `Fotografia ${index + 1}`, visibility: 'access_link', packId: photoPack
    })),
    ...selectedVideos.map((file, index) => ({
      key: keyFor('video', file.externalId),
      provider: 'mega', externalId: file.externalId, mediaType: 'video', mimeType: file.mimeType,
      title: `Vídeo ${index + 1}`, visibility: 'access_link', packId: videoPack
    }))
  ]
  return {
    schemaVersion: '1.0', profile, assets,
    packs: [
      { id: photoPack, title: `Pack de ${selectedPhotos.length} fotografias`, mediaType: 'image', assetKeys: assets.filter(asset => asset.mediaType === 'image').map(asset => asset.key) },
      { id: videoPack, title: `Pack de ${selectedVideos.length} vídeos`, mediaType: 'video', assetKeys: assets.filter(asset => asset.mediaType === 'video').map(asset => asset.key) }
    ].filter(pack => pack.assetKeys.length > 0)
  }
}
