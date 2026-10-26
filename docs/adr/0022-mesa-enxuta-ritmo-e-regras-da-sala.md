# 0022 — Mesa enxuta, ritmo do início da mão e regras editáveis na sala

**Decisão** (pedidos do desenvolvedor, com a prévia da mesa aprovada antes):

- **Rio:** a peça chamada sai do rio do jogador que a descartou e fica só no grupo de quem chamou (como
  no Mahjong Soul). Se era a peça do riichi, a próxima peça que ficou no rio é exibida deitada.
- **Início da mão:** a sessão espera a distribuição das peças (`PACING.handStartMs`) antes de alguém
  agir, inclusive na primeira mão e ao sair de uma pausa nesse momento. Na partida solo, a mesa pausa a
  sessão durante a apresentação. Na sala, que não pausa por um jogador só, o anfitrião espera também a
  apresentação (`openingPauseMs`). Assim ninguém perde tempo do relógio nela.
- **Fim da partida na sala:** o anfitrião marca a sala como encerrada só depois de publicar a visão
  final. O convidado que receber "encerrada" sem o resultado espera por ele até 8 s.
- **Mesa enxuta:**
  - Rodada, honba, bastões e dora ficam num cartão só.
  - Um menu único reúne som, música, tela cheia, código da sala, regras da partida e sair.
  - Cada jogador tem um selo na borda da mesa. Os pontos aparecem só no painel central; para leitor
    de tela, continuam também no selo.
  - O guia pode ser recolhido, e a escolha fica salva no aparelho.
  - Os avisos da sala aparecem como faixas no topo.
- **Teclas nos botões de jogada:** a preferência `actionKeys` vem ligada e pode ser desligada. Em
  telas de toque o selo da tecla não aparece. O campo novo exige publicar as regras do banco.
- **Regras da sala:** o anfitrião edita no lobby, sem sair da sala, usando a mesma tela de configurar
  partida.
  - Ao abrir a edição, as regras da sala são copiadas para as preferências locais do anfitrião.
  - Trocar de 4 para 3 jogadores muda a pessoa do 4º lugar para um lugar livre. Se não houver lugar
    livre, a troca é recusada.

**Por quê:** a mesa estava cheia de informação repetida, e o primeiro jogador perdia tempo durante a
apresentação. Copiar as regras da sala para as preferências locais evita ter dois formulários para
manter.
