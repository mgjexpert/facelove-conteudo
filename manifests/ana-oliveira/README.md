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
ana-img-001
ana-img-002
ana-video-001
ana-video-002
```

A key FaceLove é estável. O `externalId` pode mudar quando migramos de provider.

## Processo

1. GPT Work inspeciona media no ambiente de teste.
2. Gera manifest local completo, mantido fora do Git se contiver referências sensíveis.
3. Gera uma versão sanitizada para este diretório.
4. O frontend usa keys/metadata durante o desenvolvimento.
5. Ingestão futura escreve os assets reais em Supabase.
