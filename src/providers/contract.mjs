/**
 * Provider reference is server-only. It must never be serialized into the
 * public catalog or returned from a playback route.
 *
 * @typedef {{ provider: string, externalId: string, mediaType: 'image'|'video' }} ProviderReference
 * @typedef {{ size: number, mimeType: string, filename?: string }} MediaMetadata
 *
 * Provider adapter:
 *   inspect(reference): Promise<MediaMetadata>
 *   openReadStream(reference, {start, end}): Promise<Readable>
 *
 * The HTTP gateway owns status codes, Range, authorization and headers.
 * A provider only resolves metadata and a byte stream with inclusive offsets.
 */
export const MIME = Object.freeze({
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime'
})

export function mimeForFilename(filename) {
  return MIME[filename?.split('.').pop()?.toLowerCase()] || 'application/octet-stream'
}
