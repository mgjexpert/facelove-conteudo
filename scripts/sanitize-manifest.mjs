import { readFile, writeFile } from 'node:fs/promises'

const local = JSON.parse(await readFile('.private/ana-oliveira.manifest.json', 'utf8'))
const sanitized = {
  schemaVersion: '1.0',
  profile: 'anaoliveira',
  assets: local.assets.map(asset => ({
    key: asset.key,
    provider: asset.provider,
    externalId: 'LOCAL_REFERENCE_REQUIRED',
    mediaType: asset.mediaType,
    mimeType: asset.mimeType,
    title: asset.title,
    visibility: asset.visibility,
    packId: asset.packId,
    metadata: { fixture: true, playableOnlyWithLocalManifest: true }
  })),
  packs: local.packs
}
await writeFile('manifests/ana-oliveira/example.manifest.json', JSON.stringify(sanitized, null, 2) + '\n')
console.log(`Exemplo sanitizado: ${sanitized.assets.length} entradas sem referências de origem.`)
