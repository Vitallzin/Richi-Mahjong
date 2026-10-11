# 0007 — Detalhes do fluxo de jogo não fixados na spec

Convenções de implementação (padrão Tenhou/Mahjong Soul pelo que se sabe). Todas cobertas por testes em
`src/engine/game/game.test.ts` e `src/engine/scoring/scoring.test.ts`.

- **Muro morto:** modelado como 4 reposições + 5 indicadores + 5 ura. A cada kan/kita, compra-se a 1ª
  reposição e a última peça do muro vivo entra no fim das reposições (o muro morto fica sempre com 14).
  No sanma isso dá as 8 reposições exigidas (4 kan + 4 kita). Posições físicas não importam (spec 7.2).
- **Semente por mão:** o motor não gera aleatoriedade. `createMatch(rules, seed)` e `startNextHand(state, seed)`
  recebem a semente da sessão (crypto.getRandomValues), que fica guardada em `hand.seed`.
- **Resumo da mão:** cada assento confirma (`ackSummary`); com todos confirmados a sessão chama
  `startNextHand`. Se a partida acabou, a última confirmação leva à fase `matchEnded`.
- **Kan-dora pendente:** daiminkan/kakan revelam após o próximo descarte (antes da janela de ron sobre ele);
  se outro kan for declarado antes, o pendente é revelado nesse momento. Vitória por rinshan antes do
  descarte não conta a dora pendente.
- **Ippatsu e janelas de roubo:** kakan/ankan/kita quebram o ippatsu de todos só depois que a janela de ron
  fecha sem vencedor (quem rouba o kakan ainda pode ter ippatsu).
- **Suukaikan:** no descarte após o 4º kan (de jogadores diferentes), só ron é oferecido; sem ron, empate.
- **Suucha riichi:** avaliado assim que o 4º riichi é estabelecido, antes de qualquer chamada.
- **Pao:** tsumo ⇒ o responsável paga sozinho o yakuman sob pao e toda a honba; ron ⇒ responsável e
  descartador dividem meio a meio o yakuman sob pao, e a honba fica com o descartador. Outros yakuman da
  mesma mão são pagos normalmente.
- **Nagashi mangan:** pago como tsumo de mangan, sem honba nem bastões, e substitui o pagamento de noten.
  Dealer repete se estiver tenpai; honba +1.
- **Ron múltiplo:** honba e bastões só para o vencedor mais próximo do descartador (atamahane, spec 6.2);
  o dealer repete se estiver entre os vencedores.
- **Furiten temporário:** só quando a vitória era legal (com yaku e han mínimo). Recusar ron por pon/chi
  também conta como deixar passar.
- **Tenpai/esperas:** um tipo do qual a própria mão já tem as 4 cópias não é espera; tenpai = existe espera.
  Esperas sem cópias visíveis (karaten) continuam contando como tenpai.
- **Riichi:** oferecido só se ≥ 1.000 pontos, mão fechada, ≥ 4 peças no muro vivo, não logo após chi/pon.
