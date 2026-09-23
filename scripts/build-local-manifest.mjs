import { mkdir, writeFile } from 'node:fs/promises'
import { MegaProvider } from '../src/providers/mega.mjs'

const folderUrl = process.env.MEGA_FOLDER_URL
const photoId = process.env.MEGA_PHOTOS_FOLDER_ID
const videoId = process.env.MEGA_VIDEOS_FOLDER_ID
if (!folderUrl || !photoId || !videoId) {
  throw new Error('Defina MEGA_FOLDER_URL, MEGA_PHOTOS_FOLDER_ID e MEGA_VIDEOS_FOLDER_ID no ambiente local.')
}
const mega = new MegaProvider({ folderUrl })
const photos = (await mega.listFolder(photoId, 'image')).slice(0, 50)
const videos = (await mega.listFolder(videoId, 'video')).filter(file => file.mimeType === 'video/mp4').slice(0, 5)
if (photos.length < 50 || videos.length < 5) throw new Error('Origem insuficiente para o primeiro pack (50 fotos e 5 vídeos).')
const assets = [
  ...photos.map((file, index) => ({
    key: `mega-img-${String(index + 1).padStart(3, '0')}`,
    provider: 'mega', externalId: file.externalId, mediaType: 'image', mimeType: file.mimeType,
    title: `Fotografia ${index + 1}`,
    visibility: 'access_link', packId: 'ana-photos-001'
  })),
  ...videos.map((file, index) => ({
    key: `mega-video-${String(index + 1).padStart(3, '0')}`,
    provider: 'mega', externalId: file.externalId, mediaType: 'video', mimeType: file.mimeType,
    title: `Vídeo ${index + 1}`,
    visibility: 'access_link', packId: 'ana-videos-001'
  }))
]
const packs = [
  { id: 'ana-photos-001', title: 'Pack de 50 fotografias', mediaType: 'image', assetKeys: assets.filter(asset => asset.mediaType === 'image').map(asset => asset.key) },
  { id: 'ana-videos-001', title: 'Pack de 5 vídeos', mediaType: 'video', assetKeys: assets.filter(asset => asset.mediaType === 'video').map(asset => asset.key) }
]
await mkdir('.private', { recursive: true })
await writeFile('.private/ana-oliveira.manifest.json', JSON.stringify({
  schemaVersion: '1.0', profile: 'anaoliveira', generatedAt: new Date().toISOString(), assets, packs
}, null, 2) + '\n', { mode: 0o600 })
console.log(`Manifest privado: 1 pack de ${photos.length} fotos e 1 pack de ${videos.length} vídeos. Nada foi colocado no Git.`)
