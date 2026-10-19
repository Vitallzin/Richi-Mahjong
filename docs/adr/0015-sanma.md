# 0015 — Sanma (Fase 4)

Liberado pelo desenvolvedor em 19/10/2026.

- **Motor:** o sanma já vinha parametrizado desde a Fase 1 (preset, 108 peças, dora `1m⇄9m`, kita,
  ron sobre kita sem chankan, tsumo-loss/north-bisection, abortivos). A Fase 4 acrescentou os testes de
  fluxo da spec 7.13 (`src/engine/game/sanma.test.ts`) e a simulação longa (`tests/sim/sanma.test.ts`).
- **Muro morto com 8 reposições:** implementado como reposição "rolante": o muro morto tem sempre 14
  peças e, a cada kan ou kita, a última peça do muro vivo entra no lugar da reposição usada. Como há no
  máximo 4 kans e 4 Nortes, isso dá exatamente as 8 reposições da regra. A posição física dos
  indicadores é detalhe de implementação (spec 7.2).
- **Mesa:** o assento da frente fica vazio (como no Mahjong Soul); o jogador seguinte senta à direita e o
  anterior à esquerda. Cada placa mostra um selo `北×n` com os kitas do jogador.
- **Som:** a compra de reposição (kan/kita) não toca o som de compra, para o som da chamada não ser
  encoberto.
- **Bots:** Fácil e Normal declaram kita sempre que podem (estilos de kita por personagem ficam para a
  Fase 6).
- Configuração: o modo de 3 jogadores foi liberado; as regras avançadas do sanma (tsumo-loss, 0/2
  vermelhas, nuki-dora travado) já vinham da lista de opções.
