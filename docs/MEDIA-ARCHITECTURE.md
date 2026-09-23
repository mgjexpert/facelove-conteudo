# Media Architecture — FaceLove Spaces

## Objetivo

Separar três conceitos:

1. **origem** — onde o ficheiro está;
2. **identidade** — como o FaceLove referencia o asset;
3. **playback** — URL/stream temporário entregue ao viewer autorizado.

## Camadas

```text
Provider
  MEGA | Google Drive | Supabase | future
          ↓
Provider Adapter
          ↓
Media Resolver
          ↓
Authorization / access context
          ↓
Playback response
          ↓
FaceLove MediaPlayer
```

## Asset canónico

A base de dados não deve usar uma signed URL temporária como identificador.

Guardar:

```text
provider
external_id
source_reference
media_type
mime_type
thumbnail_reference
metadata
status
```

## Range

Para vídeo, o resolver deve preservar/implementar Range quando o provider permitir.

Casos de teste mínimos:

- request sem Range;
- `Range: bytes=0-`;
- Range iniciado depois de 1 MB;
- Range inválido;
- seek no player;
- ficheiro inexistente;
- provider indisponível.

Documentar `200`, `206`, `416` e headers retornados.

## Private access

A sequência correta é:

```text
viewer request
  ↓
FaceLove permission check
  ↓
media resolver
  ↓
provider access
  ↓
short-lived playback response
```

Nunca:

```text
public page
  ↓
permanent secret provider URL
```

## Thumbnails

Thumbnails são assets separados ou metadata derivada.

Não exigir que o browser abra o vídeo inteiro para gerar preview.

## Manifests

Manifests são ponte de ingestão, não a base final.

Campos mínimos:

- schemaVersion;
- profile;
- asset key;
- provider;
- externalId;
- mediaType;
- visibility.

## Estado do laboratório

O PoC MEGA já comprovou leitura parcial e Range para os tipos testados. O próximo trabalho é transformar esse comportamento em adapter e validar integração com a página Ana Oliveira.

Google Drive permanece provider experimental e deve seguir o mesmo contrato.

## Critério para promoção ao frontend

Um provider só deve ser integrado ao FaceLove Frontend quando houver:

- interface estável;
- tratamento de erros;
- teste de Range para vídeo;
- metadata suficiente;
- nenhuma credencial client-side;
- documentação de limitações.
