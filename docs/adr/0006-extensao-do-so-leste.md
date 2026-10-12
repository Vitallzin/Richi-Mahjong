# 0006 — Limite da extensão

**Decisão do desenvolvedor (11/10/2026), confirmada:** no modo Só Leste (tonpuusen), se ninguém atingir o
alvo até o fim do Leste 4, a partida continua para o Sul, com **limite absoluto no Sul 4**. Ao término do
Sul 4 a partida termina mesmo que ninguém tenha atingido o alvo (vence quem tem mais pontos). **Repetições do
dealer respeitam o limite**: no Sul 4 não há renchan que prolongue a partida.

**Mesma regra para Leste-Sul (hanchan):** extensão para o Oeste com limite absoluto no Oeste 4 (spec 6.2:
"Encerra forçado ao fim de Oeste 4"). No sanma, os limites são Sul 3 e Oeste 3.

**Durante a extensão:** a partida termina ao fim de qualquer mão em que alguém tenha ≥ alvo (spec 7.12).

Implementado em `windLimits()`/`decideMatchEnd()` (`src/engine/game/end.ts`), com testes em
`src/engine/game/game.test.ts`.
