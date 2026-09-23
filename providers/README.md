# Providers

Cada provider deve ficar isolado numa implementação própria.

Estrutura pretendida:

```text
providers/
  mega/
  google-drive/
```

Cada diretório deve documentar:

- formato da referência de origem;
- autenticação necessária;
- estratégia de metadata;
- estratégia de playback;
- suporte a HTTP Range;
- comportamento de erros;
- expiração de URLs;
- riscos de segurança;
- testes realizados.

Providers não devem definir a UX do FaceLove.
