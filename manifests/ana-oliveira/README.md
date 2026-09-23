# Ana Oliveira — Media Workspace

Este diretório contém **apenas exemplos e manifests sanitizados** destinados ao perfil de demonstração `@anaoliveira`.

Não colocar aqui:

- fotografias/vídeos reais;
- URLs secretas;
- signed URLs;
- tokens MEGA/Google;
- cookies;
- nomes reais inferidos de pessoas presentes em media.

## Convenção de keys

```text
mega-img-001
mega-img-050
mega-video-001
mega-video-005
```

A key FaceLove é estável. O `externalId` pode mudar quando migramos de provider.

## Processo

1. GPT Work inspeciona media no ambiente de teste.
2. Gera manifest local completo, mantido fora do Git se contiver referências sensíveis.
3. Gera uma versão sanitizada para este diretório.
4. O frontend usa keys/metadata durante o desenvolvimento.
5. Ingestão futura escreve os assets reais em Supabase.

Execute `npm run manifest:local` com `MEGA_FOLDER_URL`, `MEGA_PHOTOS_FOLDER_ID` e `MEGA_VIDEOS_FOLDER_ID` definidos apenas no ambiente local. O script escolhe **50 fotografias e 5 MP4**, organiza dois packs privados e grava `.private/ana-oliveira.manifest.json`, ignorado pelo Git. O ficheiro `example.manifest.json` é apenas um exemplo sanitizado e não serve para resolver media real. Para deploy, veja [VERCEL-GATEWAY.md](../../docs/VERCEL-GATEWAY.md).
