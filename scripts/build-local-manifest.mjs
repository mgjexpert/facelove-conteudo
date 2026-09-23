import { mkdir, writeFile } from 'node:fs/promises'
import { MegaProvider } from '../src/providers/mega.mjs'

const folderUrl = process.env.MEGA_FOLDER_URL
const photoId = process.env.MEGA_PHOTOS_FOLDER_ID
const videoId = process.env.MEGA_VIDEOS_FOLDER_ID
if (!folderUrl || !photoId || !videoId) {
  throw new Error('Defina MEGA_FOLDER_URL, MEGA_PHOTOS_FOLDER_ID e MEGA_VIDEOS_FOLDER_ID no ambiente local.')
}
const mega = new MegaProvider({ folderUrl })
const photos = (await mega.listFolder(photoId, 'image')).slice(0, 6)
const videos = (await mega.listFolder(videoId, 'video')).filter(file => file.mimeType === 'video/mp4').slice(0, 4)
if (photos.length < 4 || videos.length < 2) throw new Error('Origem insuficiente para a fixture local.')
const assets = [
  ...photos.map((file, index) => ({
    key: `ana-img-${String(index + 1).padStart(3, '0')}`,
    provider: 'mega', externalId: file.externalId, mediaType: 'image', mimeType: file.mimeType,
    title: `Fotografia ${index + 1}`,
    visibility: index < 4 ? 'public' : 'access_link'
  })),
  ...videos.map((file, index) => ({
    key: `ana-video-${String(index + 1).padStart(3, '0')}`,
    provider: 'mega', externalId: file.externalId, mediaType: 'video', mimeType: file.mimeType,
    title: `Vídeo ${index + 1}`,
    visibility: index < 2 ? 'public' : 'access_link'
  }))
]
await mkdir('.private', { recursive: true })
await writeFile('.private/ana-oliveira.manifest.json', JSON.stringify({
  schemaVersion: '1.0', profile: 'anaoliveira', generatedAt: new Date().toISOString(), assets
}, null, 2) + '\n', { mode: 0o600 })
console.log(`Manifest privado: ${photos.length} fotos, ${videos.length} vídeos; apenas metadata e IDs locais.`)
