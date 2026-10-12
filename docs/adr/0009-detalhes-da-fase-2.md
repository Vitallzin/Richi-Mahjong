# 0009 — Decisões de interface e sessão da Fase 2

- **Assento do jogador sorteado:** na partida solo, o assento humano (e portanto quem começa como Leste)
  é sorteado com `crypto.getRandomValues`, como numa mesa real. Os bots ocupam os demais assentos.
- **Personagens "Aleatório":** sorteia entre os que ainda não foram escolhidos; repetir só por escolha
  explícita (spec 8.3).
- **Atraso dos bots (spec 5.2):** turno 400–1500 ms; resposta a chamadas 150–600 ms. A diferença fica
  dentro da variação normal de um turno, para a velocidade não revelar se havia chamada.
- **Descarte no PC:** um clique descarta (passar o mouse já levanta a peça). No toque, 1º toque seleciona e
  o 2º descarta (spec 10.3). Teclado: ←/→ e Enter; atalhos C (chi), P (pon), K (kan), R (riichi),
  W (ron), T (tsumo), N (kita), 9 (nove órfãos), Esc (passar).
- **Estouro do tempo:** descarta a peça comprada (ou a mais à direita, após chamada) ou passa.
- **Riichi:** sempre por janela de decisão listando só os descartes que mantêm tenpai (sugestão com
  confirmação, padrão da spec 7.7). O modo "declarar automático" é uma ajuda da Fase 3.
- **3 jogadores** aparece desabilitado na configuração até a Fase 4. **Difícil** aparece como "Em breve"
  (Fase 6); o código do bot Difícil existe de forma provisória.
- **Autosave** em `localStorage` (`match:v1`) a cada ação; apagado quando a partida termina.
- **Página `/dev/pecas`** (só em desenvolvimento) para conferir as faces das pedras.
