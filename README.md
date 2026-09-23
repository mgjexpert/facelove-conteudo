# FaceLove Conteúdo

Laboratório de **media, streaming e ingestão** do FaceLove.Online.

Este repositório não é o produto visual principal. A aplicação fica em:

**mgjexpert/facelove-frontend**

Aqui validamos como fotos e vídeos são descobertos, descritos, reproduzidos e entregues ao FaceLove através de um contrato estável, independentemente do fornecedor.

> Estado atual: **media lab / Spaces Alpha — gateway Vercel preparado**

## Objetivo imediato

Dar ao FaceLove Spaces uma camada de media capaz de trabalhar, inicialmente, com os testes já preparados pelo GPT Work em:

- **MEGA.nz**
- **Google Drive**

sem acoplar o frontend a nenhum deles.

## Contexto dos testes já realizados

O laboratório já validou uma prova de conceito de MEGA com:

- listagem/organização de fotos e vídeos em packs;
- leitura parcial de JPEG/MP4;
- suporte a pedidos HTTP `Range`;
- resposta `206 Partial Content` para vídeo;
- reprodução sem necessidade de copiar previamente o ficheiro inteiro.

Existe também experiência anterior de validação de vídeo via Google Drive/preview. O objetivo neste projeto é transformar esses testes em **providers intercambiáveis**, não escolher um fornecedor definitivo nesta fase.

## Regra central

O FaceLove deve trabalhar com:

```text
provider + external_id/source_reference + metadata
```

e não assumir que uma URL temporária é a identidade permanente do media.

## Estrutura prevista

```text
docs/
  MEDIA-ARCHITECTURE.md
  GPT-WORK.md

providers/
  mega/
  google-drive/
  README.md

schemas/
  media-manifest.schema.json

manifests/
  ana-oliveira/
    README.md
    example.manifest.json

scripts/
  # futuros validadores/importadores

fixtures/
  # apenas metadata segura; nunca media privado
```

## Manifest

O laboratório pode entregar ao frontend/Supabase manifests sanitizados. O gateway Vercel descobre agora o catálogo diretamente na pasta MEGA; o manifest manual continua disponível para testes técnicos.

Exemplo:

```json
{
  "schemaVersion": "1.0",
  "profile": "anaoliveira",
  "assets": [
    {
      "key": "ana-video-001",
      "provider": "mega",
      "externalId": "opaque-provider-reference",
      "mediaType": "video",
      "mimeType": "video/mp4",
      "title": "Vídeo de teste",
      "visibility": "private",
      "metadata": {}
    }
  ]
}
```

Nunca incluir no Git:

- passwords;
- cookies;
- tokens;
- service account credentials;
- signed URLs;
- links secretos que concedam acesso a media privado;
- dados pessoais desnecessários.

## Ana Oliveira

**Ana Oliveira / @anaoliveira** será o perfil de referência do Spaces Alpha.

Este repositório pode organizar metadata e manifests para o conteúdo usado nos testes dela, mas a identidade é uma **fixture/demo**. Não inferir quem aparece nos ficheiros nem associar material real a uma pessoa sem autorização explícita.

## Provider contract

Cada provider deverá conseguir, conceitualmente:

1. reconhecer/validar uma referência;
2. obter metadata;
3. gerar ou servir uma fonte de playback;
4. informar suporte a Range quando aplicável;
5. falhar de forma previsível;
6. evitar revelar segredos ao client.

O frontend não deve conhecer a implementação interna.

## Ambientes de trabalho

Os testes locais podem usar ficheiros e URLs fora do Git.

O repositório deve conter:
- código;
- documentação;
- manifests sanitizados;
- fixtures não sensíveis;
- testes.

O repositório não deve funcionar como storage de fotos/vídeos pessoais.

## Fluxo entre repositórios

```text
MEGA / Drive / future providers
            ↓
facelove-conteudo
  discovery / metadata / playback tests
            ↓
sanitized media contract
            ↓
Supabase media_assets
            ↓
facelove-frontend
            ↓
FaceLove Space
```

## Próximo objetivo

Transformar o PoC de streaming em um adapter reutilizável para o perfil de teste **Ana Oliveira**, preservando:

- Range streaming quando suportado;
- thumbnails;
- identificação de mime type;
- estados loading/error;
- privacidade;
- portabilidade entre providers.

## Alpha 0.1 implementado

Em `main`, o código em `src/http/` trata autenticação, Range e respostas HTTP, enquanto `src/providers/mega.mjs` conhece apenas o protocolo MEGA. `npm ci && npm test` valida o gateway com provider simulado. Para o piloto Ana, basta configurar `MEGA_FOLDER_URL` e `MEDIA_GATEWAY_TOKEN` no gateway Vercel; o catálogo privado de até 50 fotos e 5 MP4 é gerado automaticamente da pasta e subpastas. `npm run manifest:local` e `npm run manifest:sanitize` continuam como ferramentas opcionais de laboratório, mantendo o manifest manual em `.private/` e o exemplo Git sem IDs de origem.

O contrato de integração com o frontend está em [docs/PLAYBACK-CONTRACT.md](docs/PLAYBACK-CONTRACT.md). Google Drive segue o mesmo contrato, mas ainda não tem origem e Range validados.

As instruções para GPT Work estão em `AGENTS.md` e `docs/GPT-WORK.md`.

## Primeiro pack reservado e deploy Vercel

`src/catalog/mega.mjs` seleciona automaticamente até **50 fotografias e 5 vídeos MP4** da pasta MEGA configurada e atribui `access_link` a todos. As referências de origem permanecem em memória no servidor; o catálogo HTTP não as devolve. O manifest manual gerado por `scripts/build-local-manifest.mjs` é opcional, permanece em `.private/`, e o exemplo em Git contém apenas placeholders. `api/gateway.mjs` reutiliza o gateway Node, incluindo HTTP Range e seek, como Function num segundo projeto Vercel. Consulte [docs/VERCEL-GATEWAY.md](docs/VERCEL-GATEWAY.md) antes de configurar o deploy.

O Google Drive mantém o mesmo contrato de provider, mas o adapter Drive ainda não foi implementado nem validado para Range. A sua ativação exige autorização, inspeção, streaming e testes próprios no laboratório.
