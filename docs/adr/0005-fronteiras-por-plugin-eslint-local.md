# 0005 — Fronteiras de camada por plugin ESLint local

**Decisão:** as regras de dependência (spec 5.1 e 5.3) são impostas por um plugin ESLint local
(`eslint/boundaries.js`) em vez de `eslint-plugin-boundaries`/`import/no-restricted-paths`.

- `local/engine-isolation`: `src/engine/` não importa nenhum pacote nem caminho fora de `src/engine/`.
- `local/player-view-only`: `src/help/` e `src/bots/` só importam a entrada pública `src/engine`
  e nunca `MatchState`, `getTrainingView` ou `applyAction`; também não importam session/net/state/ui.
- Configuração do motor proíbe `Math.random`, `Date.now`, `new Date()` e globais de ambiente (DOM, timers).

**Por quê:** as alternativas dependem de resolvedores de import para TypeScript e ignoram silenciosamente
imports não resolvidos. O plugin local resolve caminhos relativos por conta própria, é pequeno e é coberto
por testes (`tests/lint-boundaries.test.ts`).
