import { createHash } from 'node:crypto'

export async function buildAlbumCatalog({ profile, albums, providers }) {
  const assets = []
  const packs = []
  for (const album of albums) {
    const provider = providers[album.id]
    const mediaTypes = album.media_type === 'mixed' ? ['image', 'video'] : [album.media_type]
    const listed = (await Promise.all(mediaTypes.map(type =>
      provider.selectedFolderId ? provider.listFolder(provider.selectedFolderId, type) : provider.listMedia(type)
    ))).flat()
    // A pack can be configured as images, videos, or a mixed album.
    const selected = [
      ...listed.filter(file => file.mediaType === 'image').slice(0, 50),
      ...listed.filter(file => file.mediaType === 'video' && file.mimeType === 'video/mp4').slice(0, 5)
    ]
    const assetKeys = []
    selected.forEach((file, index) => {
      const key = `asset-${createHash('sha256').update(`${album.id}\0${file.externalId}`).digest('hex').slice(0, 24)}`
      assetKeys.push(key)
      assets.push({ key, provider: album.id, externalId: file.externalId,
        mediaType: file.mediaType, mimeType: file.mimeType, title: `${file.mediaType === 'image' ? 'Fotografia' : 'Vídeo'} ${index + 1}`,
        visibility: 'access_link', packId: album.id })
    })
    packs.push({ id: album.id, title: album.title, mediaType: album.media_type,
      assetKeys, visibility: album.visibility })
  }
  return { schemaVersion: '1.0', profile, assets, packs }
}
