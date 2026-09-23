# Gateway FaceLove na Vercel

## O que é publicado

Importar `mgjexpert/facelove-conteudo` como **segundo projeto Vercel** (Framework: Other, Root Directory: raiz, Install Command: `npm ci`, sem Build Command e sem Output Directory). Production Branch: `main`. `vercel.json` fixa `framework: null` (preset Other) e reescreve `/health`, `/v1/catalog` e `/v1/media/:key` para `api/gateway.mjs`, que reutiliza `src/http/gateway.mjs` e `src/providers/mega.mjs`. O endpoint público só entrega catálogo e media com `Authorization: Bearer <MEDIA_GATEWAY_TOKEN>`; `/health` confirma apenas a configuração, sem testar a leitura da origem. Se o primeiro deploy usou o preset **Node.js**, altere-o para **Other** em Settings → Build and Deployment antes do redeploy. O preset Node.js arranca `src/server.mjs` e tenta ler `.private/ana-oliveira.manifest.json`, um ficheiro que não pode estar no Git.

Criar **somente no projeto do gateway**, em Vercel Settings → Environment Variables → Production:

| Variável | Valor |
| --- | --- |
| `MEGA_FOLDER_URL` | Link completo da pasta autorizado, incluindo `#` e chave. Valor secreto, nunca no Git. |
| `MEDIA_MANIFEST_BASE64` | Manifest privado local codificado em base64. Contém IDs e referências de origem. |
| `MEDIA_GATEWAY_TOKEN` | Segredo aleatório de pelo menos 24 caracteres; deve coincidir com o do frontend. |

Antes do deploy, gerar o primeiro manifest em máquina autorizada com `.env` local ignorado pelo Git. **Colocar aspas em `MEGA_FOLDER_URL` no `.env` para que a chave após `#` seja lida corretamente por `node --env-file`.** Executar:

```bash
node --env-file=.env scripts/build-local-manifest.mjs
node scripts/sanitize-manifest.mjs
node -e 'process.stdout.write(require("node:fs").readFileSync(".private/ana-oliveira.manifest.json").toString("base64"))' > .private/manifest.base64.txt
```

Copiar o conteúdo de `.private/manifest.base64.txt` diretamente para a variável Vercel. O ficheiro está ignorado e não é para partilhar por chat, PR, log ou URL. O primeiro manifest mede aproximadamente 16 KB antes de codificar; reavaliar o limite de variáveis da conta antes de adicionar mais packs. Um manifest maior deve ser guardado em armazenamento privado apropriado, nunca em ficheiros Git nem em `NEXT_PUBLIC_`.

O gateway recebe um nome estável atribuído pela Vercel, como `https://<nome-do-projeto>.vercel.app`. Usar o endereço de **produção** mostrado no painel como `MEDIA_GATEWAY_URL` do projeto frontend. Não apontar o frontend Vercel para `localhost`. O gateway pode ser consultado por qualquer pessoa na rede, mas os endpoints de conteúdo exigem token. Manter este segredo exclusivamente no servidor frontend.

## Verificação após o deploy

1. `/health` deve devolver `200`; um pedido a `/v1/catalog` **sem** Bearer deve devolver `401`.
2. Com o Bearer configurado, `/v1/catalog` deve devolver dois packs (50 fotografias e 5 vídeos) sem `externalId`, URL da pasta nem chave.
3. Um `HEAD /v1/media/mega-video-001` autorizado deve devolver `200` e `Accept-Ranges: bytes`.
4. `GET /v1/media/mega-video-001` com `Range: bytes=1048576-1052671` deve devolver `206`, `Content-Range` correto e apenas 4096 bytes. Se o ficheiro escolhido for mais curto, usar uma faixa dentro do tamanho.
5. Fazer a verificação de ponta a ponta pelo frontend: sem convite `403` na URL FaceLove; após convite, vídeo e seek a funcionar. Não testar partilhando o token do gateway com o navegador.

## Limites desta configuração

O MEGAJS enumera a pasta em cada instância fria e pode sofrer latência, falhas ou quotas da origem. Cada pedido de vídeo é uma Function Vercel e consome duração/transferência; o limite `maxDuration` é 300 segundos neste projeto, sujeito ao plano e à configuração efetiva. A Function não transcodifica vídeo nem gera thumbnails. Esta configuração é apropriada para um piloto controlado; antes de tráfego elevado ou vídeos longos, medir tempos, custos e comportamento de seek e considerar um serviço persistente ou fornecedor especializado.

Para Google Drive, implementar `inspect`/`openReadStream` no adapter `src/providers/google-drive.mjs`, guardar referências e credenciais apenas no servidor e repetir os testes de `200`, `206`, Range e seek. **Drive ainda não está operacional neste commit.** O frontend continua a consumir a mesma API FaceLove.
