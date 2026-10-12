# 0010 — Decisões das ajudas, tutorial e acessibilidade (Fase 3)

- **Painel "Guia" na mesa:** mostra a situação da mão atual ou, ao passar o mouse/selecionar uma peça, a da
  mão que sobraria descartando-a. É análise do que o jogador escolheu olhar, **nunca uma sugestão** de
  descarte (spec 9.6): o painel não destaca nem ordena descartes.
- **No Yaku:** calculado de verdade com o motor de pontuação a partir da PlayerView, separado em ron e tsumo.
  Situações que não dependem da mão (ippatsu, haitei, rinshan, chankan) ficam de fora; dora conta para o
  han mínimo. Quando a mão fechada fora de riichi não tem yaku, o guia diz se o riichi daria yaku.
- **"Não visíveis"** = 4 − (própria mão + descartes + grupos expostos + indicadores revelados + kita),
  via `visibleCounts` do motor (compartilhado com os bots). Nunca "no muro".
- **Furiten na análise de candidato:** descartar limpa o furiten temporário, mas não o de riichi.
- **Sem chamadas:** chi/pon/kan não são mostrados e a sessão passa automaticamente quando a única opção era
  chamar. Ron continua aparecendo.
- **Riichi "declarar direto":** só quando há um único descarte que mantém o tenpai, o botão Riichi declara sem
  abrir a janela; com várias opções, sempre pergunta (spec 7.7). O jogo nunca declara sem o clique do jogador.
- **Rótulos:** camada própria na pedra (canto superior, fundo escuro, texto branco), por contexto React —
  independe do tema. Padrão: números ligados, ventos por nome, dragões desligados (spec 9.4).
- **Modo treino:** `MatchSession.getRevealedHands()` só devolve mãos na sessão local com a opção ligada,
  e só a UI usa. Fica nas configurações avançadas (spec 6.6); a partida fica marcada `training` nas
  configurações da sessão para o histórico da Fase 5.
- **Tutorial:** Markdown próprio mínimo (títulos, parágrafos, listas, citações, negrito/itálico e `[[123m]]`
  para pedras), sem HTML cru. Texto escrito para iniciantes; **revisar** (spec 10.8).
- **Acessibilidade:** "Reduzir movimento" e "Alto contraste" como atributos no `<html>`; tamanho das peças da
  mão 1×/1,1×/1,2× (limite para caber no palco); anúncios para leitor de tela num `aria-live`.
  Botão Pon escurecido para contraste AA com texto branco.
- **Boas-vindas:** aparece ao clicar em "Jogar partida" no primeiro uso; "Decidir depois" mantém os padrões.
