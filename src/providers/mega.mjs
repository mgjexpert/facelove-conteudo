import { File } from 'megajs'
import { mimeForFilename } from './contract.mjs'

export class MegaProvider {
  provider = 'mega'
  #folderUrl
  #selectedFolderId
  #files
  #loading

  constructor({ folderUrl }) {
    if (!folderUrl) throw new Error('MEGA_FOLDER_URL ausente')
    const parsed = new URL(folderUrl)
    if (!['mega.nz', 'mega.co.nz'].includes(parsed.hostname) || !parsed.pathname.startsWith('/folder/')) {
      throw new Error('É necessário um link de pasta pública MEGA')
    }
    this.#folderUrl = parsed.origin + parsed.pathname + '#' + parsed.hash.slice(1).split('/folder/')[0]
    this.#selectedFolderId = parsed.hash.match(/\/folder\/([a-zA-Z0-9_-]+)/)?.[1] || null
  }

  get selectedFolderId() { return this.#selectedFolderId }

  async #load() {
    if (this.#files) return this.#files
    if (!this.#loading) {
      this.#loading = (async () => {
        const root = File.fromURL(this.#folderUrl)
        await root.loadAttributes()
        const files = new Map()
        const folders = new Map()
        const queue = [root]
        while (queue.length) {
          const node = queue.shift()
          const id = node.downloadId?.[1] || node.nodeId
          if (node.directory) {
            if (id) folders.set(id, node)
            queue.push(...(node.children || []))
          } else if (id) files.set(id, node)
        }
        this.#files = { files, folders }
        return this.#files
      })().finally(() => { this.#loading = undefined })
    }
    return this.#loading
  }

  async listFolder(folderId, mediaType) {
    const { folders } = await this.#load()
    const folder = folders.get(folderId)
    if (!folder) throw new Error('Pasta MEGA não encontrada')
    return (folder.children || [])
      .filter(file => !file.directory && mimeForFilename(file.name).startsWith(mediaType + '/'))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt', { numeric: true }))
      .map(file => ({
        externalId: file.downloadId?.[1] || file.nodeId,
        mediaType,
        mimeType: mimeForFilename(file.name),
        size: file.size,
        filename: file.name
      }))
  }

  async listMedia(mediaType) {
    const { files } = await this.#load()
    return [...files.values()]
      .filter(file => {
        const mime = mimeForFilename(file.name)
        return mediaType === 'video' ? mime === 'video/mp4' : mime.startsWith('image/')
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt', { numeric: true }) ||
        String(a.downloadId?.[1] || a.nodeId).localeCompare(String(b.downloadId?.[1] || b.nodeId)))
      .map(file => ({
        externalId: file.downloadId?.[1] || file.nodeId,
        mediaType,
        mimeType: mimeForFilename(file.name),
        size: file.size,
        filename: file.name
      }))
  }

  async inspect(reference) {
    const { files } = await this.#load()
    const file = files.get(reference.externalId)
    if (!file) return null
    return { size: file.size, mimeType: mimeForFilename(file.name), filename: file.name }
  }

  async openReadStream(reference, { start, end }) {
    const { files } = await this.#load()
    const file = files.get(reference.externalId)
    if (!file) throw new Error('Asset MEGA não encontrado')
    return file.download({ start, end, maxConnections: 1 })
  }
}
