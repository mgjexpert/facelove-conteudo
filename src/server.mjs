import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createGateway } from './http/gateway.mjs'
import { MegaProvider } from './providers/mega.mjs'
import { GoogleDriveProvider } from './providers/google-drive.mjs'

const manifestPath = resolve(process.env.MEDIA_MANIFEST_PATH || '.private/ana-oliveira.manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const token = process.env.MEDIA_GATEWAY_TOKEN
const providers = {
  mega: new MegaProvider({ folderUrl: process.env.MEGA_FOLDER_URL }),
  google_drive: new GoogleDriveProvider()
}
const server = createGateway({ manifest, providers, token })
const host = process.env.MEDIA_GATEWAY_HOST || '127.0.0.1'
const port = Number(process.env.MEDIA_GATEWAY_PORT || 4100)
server.listen(port, host, () => console.log(`Media gateway em http://${host}:${port}`))
