# AGENTS.md — FaceLove Conteúdo

## Missão

Transformar os testes de media existentes em uma camada reutilizável pelo **FaceLove Spaces**, sem acoplar o produto a MEGA, Google Drive ou qualquer provider específico.

## Trabalhar neste repositório quando

A tarefa envolver:

- experimentar MEGA/Drive;
- Range requests;
- streaming/proxy;
- thumbnails;
- metadata;
- manifests;
- detecção de MIME;
- providers/adapters;
- ingestão;
- testes de performance;
- documentação do comportamento de fornecedores.

## Não trabalhar aqui quando

A tarefa for principalmente:

- layout;
- perfil visual;
- feed;
- dashboard;
- autenticação de produto;
- design system.

Essas mudanças pertencem a `mgjexpert/facelove-frontend`.

## Baseline técnico já validado

Há um PoC MEGA preparado pelo GPT Work que demonstrou leitura parcial e suporte a HTTP Range para JPEG/MP4, incluindo resposta 206 para vídeo. Reutilizar esse conhecimento; não começar do zero sem motivo.

O Work deve localizar os ficheiros de teste já produzidos na sua sessão/área de trabalho e documentar o que é reaproveitável. **Não copiar media privado para este repositório.**

## Perfil alvo do Alpha

**Ana Oliveira / @anaoliveira**.

Usar o conteúdo de teste disponível apenas como fonte de validação técnica. O resultado a entregar ao produto é metadata/manifest e uma interface de playback segura.

## Contrato mínimo por asset

```ts
interface LabMediaAsset {
  key: string;
  provider: "mega" | "google_drive" | "supabase" | "external";
  externalId: string;
  mediaType: "image" | "video";
  mimeType?: string;
  title?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  thumbnailReference?: string;
  visibility: "public" | "followers" | "private" | "access_link";
  metadata?: Record<string, unknown>;
}
```

## Regras de segurança

- Nunca commitar credenciais.
- Nunca commitar cookies/sessões.
- Nunca commitar URLs assinadas.
- Nunca commitar ficheiros pessoais/íntimos.
- Nunca expor source URLs diretamente ao frontend se isso contornar autorização.
- Não usar o repositório público como catálogo de links privados.
- Sanitizar exemplos.
- O provider pode conhecer a origem; o componente de UI não.

## Branches recomendadas

```text
work/mega-provider
work/drive-provider
work/media-manifest
work/ana-media
```

## Primeira missão do GPT Work

1. Rever os ficheiros PoC já criados.
2. Identificar o código que implementa Range/streaming.
3. Separar a lógica específica de provider da camada HTTP comum.
4. Criar um adapter MEGA experimental.
5. Criar um adapter Google Drive experimental ou documentar limitações.
6. Produzir um manifest sanitizado para Ana Oliveira.
7. Documentar como o `facelove-frontend` deve chamar o resolver.
8. Criar testes de Range, status codes e headers relevantes.
9. Não introduzir pagamentos, subscriptions ou UX neste repo.

## Interface recomendada

O laboratório deve convergir para algo equivalente a:

```ts
interface MediaProviderAdapter {
  provider: string;
  inspect(reference: ProviderReference): Promise<MediaMetadata>;
  resolvePlayback(
    reference: ProviderReference,
    request?: { range?: string }
  ): Promise<PlaybackResolution>;
}
```

A forma exata pode evoluir, desde que seja documentada.

## Entrega esperada de cada teste

Para cada provider, registar:

- como autentica/acede;
- se suporta links públicos;
- se suporta Range;
- status HTTP observado;
- headers relevantes;
- comportamento de seek;
- expiração de URLs;
- limite/tamanho observado;
- riscos de exposição da origem;
- recomendação para Alpha;
- itens ainda não testados.

## Não decidir prematuramente

MEGA e Drive são fornecedores de teste. Não os transformar em requisito permanente do FaceLove.

A arquitetura precisa permitir migração posterior para Supabase Storage, Cloudflare Stream, Mux ou outro serviço sem reescrever o feed.
