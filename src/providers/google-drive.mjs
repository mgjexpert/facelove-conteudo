export class GoogleDriveProvider {
  provider = 'google_drive'
  async inspect() {
    throw new Error('Google Drive não configurado; requer origem e método de autorização validados.')
  }
  async openReadStream() {
    throw new Error('Streaming Google Drive não implementado neste Alpha.')
  }
}
