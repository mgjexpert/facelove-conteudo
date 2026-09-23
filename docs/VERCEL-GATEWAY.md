# Gateway FaceLove na Vercel

## O que é publicado

Importar `mgjexpert/facelove-conteudo` como **segundo projeto Vercel** (Framework: Other, Root Directory: raiz, Install Command: `npm ci`, sem Build Command e sem Output Directory). Production Branch: `main`. `vercel.json` fixa `framework: null` (preset Other) e reescreve `/health`, `/v1/catalog` e `/v1/media/:key` para `api/gateway.mjs`, que reutiliza `src/http/gateway.mjs` e `src/providers/mega.mjs`. O endpoint público só entrega catálogo e media com `Authorization: Bearer <MEDIA_GATEWAY_TOKEN>`; `/health` confirma apenas a configuração, sem testar a leitura da origem. Se o primeiro deploy usou o preset **Node.js**, altere-o para **Other** em Settings → Build and Deployment antes do redeploy.

Criar **somente no projeto do gateway**, em Vercel Settings → Environment Variables → Production:

| Variável | Valor |
| --- | --- |
| `MEGA_FOLDER_URL` | Link completo da pasta partilhada autorizada para a demo Ana, incluindo `#` e chave. Valor secreto, nunca no Git. |
| `MEDIA_GATEWAY_TOKEN` | Segredo aleatório de pelo menos 24 caracteres; deve coincidir com o do frontend. |

**Não configurar `MEDIA_MANIFEST_BASE64`.** Depois de guardar as duas variáveis, fazer redeploy de produção. O gateway enumera a pasta MEGA e subpastas no servidor e escolhe até 50 imagens e 5 vídeos MP4. Os ficheiros são ordenados por nome, as chaves públicas são derivadas de identificadores opacos estáveis e a resposta do catálogo omite IDs de origem, chave MEGA e link da pasta. A seleção fica em cache por instância durante cinco minutos; pastas novas entram na próxima atualização. Só colocar na pasta partilhada media autorizado para este piloto.

Para desenvolvimento local, `node --env-file=.env src/server.mjs` também descobre o catálogo diretamente. **Colocar aspas em `MEGA_FOLDER_URL` no `.env` para que a chave após `#` seja lida corretamente por `node --env-file`.** Os comandos abaixo são opcionais e servem somente para conservar o PoC com manifest manual:

```bash
node --env-file=.env scripts/build-local-manifest.mjs
node scripts/sanitize-manifest.mjs
```

O manifest de laboratório fica em `.private/` e não é para partilhar por chat, PR, log ou URL. `MEGA_PHOTOS_FOLDER_ID` e `MEGA_VIDEOS_FOLDER_ID` só são necessários para o script manual; não são variáveis Vercel.

O gateway recebe um nome estável atribuído pela Vercel, como `https://<nome-do-projeto>.vercel.app`. Usar o endereço de **produção** mostrado no painel como `MEDIA_GATEWAY_URL` do projeto frontend. Não apontar o frontend Vercel para `localhost`. O gateway pode ser consultado por qualquer pessoa na rede, mas os endpoints de conteúdo exigem token. Manter este segredo exclusivamente no servidor frontend.

## Verificação após o deploy

1. `/health` deve devolver `200`; um pedido a `/v1/catalog` **sem** Bearer deve devolver `401`.
2. Com o Bearer configurado, `/v1/catalog` deve devolver até dois packs (50 fotografias e 5 vídeos para a pasta de teste) sem `externalId`, URL da pasta nem chave. A primeira leitura pode demorar enquanto a pasta é enumerada.
3. Usar a `key` de um vídeo retornada no catálogo: um `HEAD /v1/media/<key>` autorizado deve devolver `200` e `Accept-Ranges: bytes`.
4. `GET /v1/media/<key>` com `Range: bytes=1048576-1052671` deve devolver `206`, `Content-Range` correto e apenas 4096 bytes. Se o ficheiro escolhido for mais curto, usar uma faixa dentro do tamanho.
5. Fazer a verificação de ponta a ponta pelo frontend: sem convite `403` na URL FaceLove; após convite, vídeo e seek a funcionar. Não testar partilhando o token do gateway com o navegador.

## Limites desta configuração

O MEGAJS enumera a pasta em cada instância fria e pode sofrer latência, falhas ou quotas da origem. Cada pedido de vídeo é uma Function Vercel e consome duração/transferência; o limite `maxDuration` é 300 segundos neste projeto, sujeito ao plano e à configuração efetiva. A Function não transcodifica vídeo nem gera thumbnails. Esta configuração é apropriada para um piloto controlado; antes de tráfego elevado ou vídeos longos, medir tempos, custos e comportamento de seek e considerar um serviço persistente ou fornecedor especializado.

**Escopo de contas:** esta pasta ainda está associada só à fixture `@anaoliveira`. O Supabase ligado ao projeto não tem utilizadores nem tabelas da aplicação, por isso ainda não existe associação por conta, dashboard de ligação nem separação entre creators. Para múltiplos Spaces, o passo seguinte é criar Auth, `profiles`, `spaces` e fontes privadas por `space_id` no Supabase; cada fonte deverá ser selecionada pelo gateway após autorização. Não usar `MEGA_FOLDER_URL` global como solução multiutilizador.

Para Google Drive, implementar `inspect`/`openReadStream` no adapter `src/providers/google-drive.mjs`, guardar referências e credenciais apenas no servidor e repetir os testes de `200`, `206`, Range e seek. **Drive ainda não está operacional neste commit.** O frontend continua a consumir a mesma API FaceLove.
