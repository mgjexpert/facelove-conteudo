# GPT Work — Plano de Trabalho para FaceLove Spaces

## Contexto

Os testes de streaming existentes deixam de ser experiências isoladas. A partir de agora devem servir o produto **FaceLove Spaces Alpha 0.1**.

Repositórios:

- Produto/UI: `mgjexpert/facelove-frontend`
- Media lab: `mgjexpert/facelove-conteudo`

Supabase do projeto:

```text
https://uwsuavbskwankqchqkcu.supabase.co
```

Não colocar secrets no Git.

## Persona de teste

Criar a experiência usando:

**Ana Oliveira — @anaoliveira**

Ela é uma fixture de produto. Usar os ficheiros disponíveis no ambiente Work como media de teste, sem afirmar que as pessoas eventualmente presentes nesses ficheiros são "Ana Oliveira".

## Trabalho imediato

### No facelove-conteudo

- recuperar/rever o PoC MEGA já criado;
- isolar gateway/Range;
- criar contrato de provider;
- mapear os ficheiros de teste para um manifest local;
- gerar uma versão sanitizada do manifest que possa ser commitada;
- documentar resultados;
- manter media real fora do Git.

### No facelove-frontend

- criar branch `work/spaces-alpha`;
- inicializar Next.js + TypeScript + Tailwind;
- implementar shell visual FaceLove;
- implementar `/@anaoliveira`;
- usar inicialmente fixture/manifest para renderizar;
- criar MediaCard/MediaPlayer sem dependência de provider;
- integrar resolver apenas depois.

## Fluxo de teste desejado

```text
media real disponível no Work
        ↓
provider lab
        ↓
manifest / provider reference
        ↓
Ana Oliveira fixture
        ↓
FaceLove feed
        ↓
click video
        ↓
authorization context
        ↓
resolver
        ↓
Range playback
```

## Não fazer

- não duplicar o PoC sem rever o que já existe;
- não subir media real para GitHub;
- não usar blob URLs capturadas como fonte persistente;
- não colar URLs efémeras na UI;
- não implementar pagamento;
- não chamar conteúdo de adulto/íntimo por inferência;
- não tornar a página privada pública só para facilitar o teste.

## Resultado esperado desta etapa

Uma versão preview navegável onde:

1. Ana tem perfil;
2. há grid/feed de fotos;
3. há vídeos;
4. pelo menos um vídeo consegue seek/Range pelo provider em teste;
5. conteúdo privado tem estado locked;
6. existe uma rota de convite demonstrável;
7. o provider pode ser trocado sem alterar o componente de feed.

No fim, entregar um resumo com evidências técnicas e URLs de preview/PR quando existirem.
