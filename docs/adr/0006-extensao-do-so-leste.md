# 0006 — Limite da extensão na partida "só Leste"

**Contexto:** a spec (6.2) diz "Leste→Sul; Leste-Sul→Oeste. Encerra forçado ao fim de Oeste 4", sem dizer
se a partida só-Leste pode avançar até o Oeste.

**Decisão (provisória, a confirmar com o desenvolvedor):** cada duração estende **um** vento, como no
Mahjong Soul: só-Leste termina no máximo ao fim de Sul 4 (Sul 3 no sanma); Leste-Sul, ao fim de Oeste 4
(Oeste 3 no sanma). Implementado em `windLimits()` (`src/engine/game/end.ts`).

**Durante a extensão:** a partida termina ao fim de qualquer mão em que alguém tenha ≥ alvo (leitura literal
da spec 7.12), inclusive se o dealer repetir.
