# 0019 — Endurecimento: cabeçalhos HTTP, limites no banco, código de sala

Resultado de um check-up de segurança (21/10/2026).

## Cabeçalhos do Hosting (`firebase.json`)

- Valendo já: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy` (câmera, microfone,
  localização etc. desligados). O HSTS o próprio Hosting já envia.
- **CSP em modo `Report-Only`** por enquanto. A política libera só o necessário: `apis.google.com`
  e o `authDomain` (login por popup/redirecionamento), `*.firebaseio.com` (WebSocket e o
  long-polling do Realtime Database, que usa script e iframe), fotos do Google
  (`*.googleusercontent.com`) e `'unsafe-inline'` só em estilos.
  Partida solo testada com a política **forçada**, sem nenhuma violação (Worker do bot, sons, fontes).
  Login e salas não puderam ser testados assim. **Para ativar:** publicar, entrar com Google, criar e
  entrar numa sala olhando o console (avisos `[Report Only]`); sem avisos, trocar a chave para
  `Content-Security-Policy`.
- O emulador do Hosting não aplica `headers`: confira no site publicado (DevTools → Network).

## Limites nas regras do Realtime Database

No plano Spark (ADR 0002) a cota é do projeto inteiro: uma conta podia gravar dados de qualquer tamanho
na própria pasta ou no inbox e esgotar a cota de todos. Agora:

- Toda pasta tem lista fechada de chaves (`$other: false`), tipos e tamanho máximo de textos:
  `settings`, `history`, `meta`, `seats`, `public`, `private` e as ações do `inbox`.
- `settings` continua no mesmo formato do `localStorage` (spec 12.1); `settingsData()` grava só chaves
  conhecidas, para que chaves antigas aninhadas não sejam recusadas.
- Limites com folga sobre o medido: visão ≤ 128 KiB (maior medida ~11 KiB), eventos ≤ 64 KiB,
  regras/ajustes da sala ≤ 4 KiB (~0,5 KiB). O anfitrião corta `lastError` em 200 caracteres, porque
  uma escrita recusada derrubaria a publicação inteira e travaria a mesa.
- `meta`: `createdAt` não pode estar no futuro (5 min de tolerância) e `expiresAt` fica a no máximo
  25 h dele; ninguém entra em sala expirada.
- **O que as regras não conseguem:** contar filhos (número de partidas no histórico, de membros, de
  salas por pessoa, de mensagens no inbox). Isso exigiria Cloud Functions, fora do Spark.

`tests/database-rules-schema.test.ts` (roda no `npm test`, sem Java) confere que as regras cobrem tudo
o que o app grava, com dados montados pelo próprio código (`tests/support/dbSamples.ts`). Ao criar uma
preferência, campo de histórico ou ação nova, é preciso atualizar `database.rules.json`.

## Código de sala

O código é a única chave para entrar numa sala: passa a vir de `crypto.getRandomValues` (antes,
`Math.random`).
