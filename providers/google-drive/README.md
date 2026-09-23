# Google Drive experimental

O contrato `inspect/openReadStream` já admite outro provider, mas o adapter Google Drive devolve erro explícito neste Alpha. Não existe nesta sessão uma origem Drive autorizada e validada para Range. Links `/preview` e `blob:` não são identidade persistente nem prova de seek programático.

Para ativar o Drive: configurar autorização server-side, validar acesso ao ficheiro, MIME/tamanho, Range e `206`, erros de quota/expiração e política de partilha. Não converter silenciosamente para link público no frontend.
