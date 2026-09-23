# Media resolver → FaceLove Frontend (Alpha 0.1)

O gateway Node serve **apenas ao servidor frontend**, com `Authorization: Bearer <MEDIA_GATEWAY_TOKEN>`. Não disponibilizar o gateway numa origem pública sem proteção de rede e token. O componente React nunca recebe este token nem `externalId`.

## Sequência

1. O frontend lê `media_asset.key` e `visibility` da fixture ou da base de dados.
2. O servidor frontend verifica se o visitante pode aceder ao asset. Só então chama `GET /v1/catalog` ou `GET /v1/media/:key` no gateway.
3. `GET /api/media/:key` no frontend transmite o fluxo autorizado ao navegador e encaminha `Range`. A URL do provider não é devolvida.
4. O gateway obtém metadata do provider, calcula a faixa e abre o stream com `start`/`end` inclusivos.

O catálogo `/v1/catalog` fornece apenas `key`, `mediaType`, `mimeType`, `title`, `caption`, `visibility` e `thumbnailReference`. Não devolve `externalId`, URL de origem nem chaves.

| Pedido ao gateway | Resposta | Headers relevantes |
| --- | --- | --- |
| `HEAD /v1/media/:key` ou `GET` sem Range | 200 | Content-Type, Content-Length, Accept-Ranges |
| `GET` com `Range: bytes=1048576-1052671` | 206 | Content-Range, Content-Length, Accept-Ranges |
| Range inválido / fora dos limites | 416 | Content-Range: bytes */size |
| Key desconhecida / origem ausente | 404 | JSON |
| Token ausente / errado | 401 | JSON |
| Provider sem configuração | 503 | JSON |

Faixas pedidas têm limite de 2 MiB por resposta. O pedido sem Range é `200` com stream integral e não usa buffer do ficheiro em memória. O provider MEGA opera com offsets inclusivos. JPEG e MP4 foram testados; codecs, quota e disponibilidade dependem da origem. Não há transcodificação.

## Thumbnails

`thumbnailReference` poderá referir outra `key` de imagem com a sua própria autorização. Este Alpha não deriva poster a partir de vídeos nem usa o vídeo completo para criar miniatura. Para imagens do feed, o frontend pede a própria imagem ao resolver. Geração de miniaturas e tamanhos derivados ficam para uma fase posterior.

## Exemplo de ambiente local

```text
MEDIA_GATEWAY_URL=http://127.0.0.1:4100
MEDIA_GATEWAY_TOKEN=<segredo-servidor>
```

Os valores reais e o manifest de referência ficam fora do Git. Ao substituir MEGA por Drive, R2 ou Mux, preservar o `key` FaceLove, trocar o adapter e atualizar a referência interna.
