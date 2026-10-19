# 0016 — Apresentação dos jogadores e caminho de yaku

Pedido do desenvolvedor (19/10/2026).

## Apresentação

- Toda vez que a mesa abre (partida nova ou "Continuar"), aparece a apresentação: selo da rodada
  (ex.: 東一局), modo · duração · tempo, e um cartão por jogador entrando pelo seu lado da mesa, com
  vento do assento, dealer, pontos e, para os bots, o estilo (Defensivo/Agressiva/Equilibrado) e a frase
  do personagem.
- A partida fica **pausada** durante a apresentação (mesma pausa da janela de sair): relógio congelado e
  bots esperando. Fecha em ~5 s, no botão "Começar"/"Continuar" ou com um clique.

## Caminho de yaku no guia

- O guia mostra qual yaku a mão está seguindo, com nome e explicação curta. Em tenpai, sai das esperas
  ("garantido nas esperas"); antes disso, é uma estimativa pela forma ("pela forma da mão"): yakuhai
  (par/trinca de valor), toitoi (só pon/kan e pares), chiitoitsu (4+ pares, fechada), honitsu/chinitsu
  (no máximo 1 peça fora do naipe), tanyao (com kuitan se aberta) e riichi (mão fechada).
- Mão aberta sem nenhum caminho: aviso "sem yaku você não pode vencer".
- Não sugere descarte (spec 9.6): descreve a mão, não diz o que fazer. Ajuda própria "Caminho de yaku",
  ligada por padrão.

## Correção

- A base comum dos botões (`Button.module.css`) passou a usar `:where()` (especificidade zero). Antes,
  o `position: relative` dela vencia o `position: absolute` do "Continuar" do placar, que ia parar no
  topo da tela.
