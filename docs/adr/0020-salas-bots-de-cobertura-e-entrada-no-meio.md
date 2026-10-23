# 0020 — Salas: bot no lugar de quem sai ou fica parado, entrada no meio e volta à sala

Pedido do desenvolvedor em 22/10/2026 (ajustes do site). Muda pontos da spec 13.2, 13.6 e 13.7.

## Bot de cobertura

- Quem **sai ou cai** (presença some) é coberto por um bot até voltar (13.6). Agora o bot é **Normal
  com personagem sorteado** (antes: sempre Sora).
- Quem **fica parado** também é coberto (`cover: 'idle'`), em qualquer modo de tempo, inclusive o
  próprio anfitrião:
  - tempo ilimitado: 60 s sem decidir (`IDLE_TURN_MS`);
  - com relógio: 2 estouros seguidos (`IDLE_TIMEOUTS`); no 2º, o bot decide a jogada em vez da ação
    padrão;
  - resultado da mão (não tem relógio): 60 s sem continuar (`IDLE_SUMMARY_MS`), senão um parado
    travaria a mesa de todos.
- Volta: qualquer ação do jogador (ou o botão "Voltar a jogar", mensagem `resume` no inbox) tira o
  bot na hora. Reconectar só tira o bot de quem tinha **saído**; quem estava parado continua coberto
  até agir.
- A cobertura vai para o banco em `seats/{i}/cover` (`away` | `idle`), escrita pelo anfitrião. Cada
  cliente mostra "(bot)" ao lado do nome e avisos ("saiu", "está parado", "voltou", "entrou") a partir
  da mudança dos assentos — sem canal novo.

## Sair da partida

- Convidado: o aviso diz que um bot assume e que dá para voltar; o menu mostra **"Voltar à sala"**
  (última sala guardada em `localStorage`, `rooms:active`, apagada quando a sala acaba).
- Anfitrião: sair **encerra a partida para todos** (a sala é apagada). Se ele só cair, nada muda: a
  partida pausa e ele retoma pelo autosave (13.6), também pelo "Voltar à sala".
- No lobby, o "voltar" do anfitrião pede confirmação e fecha a sala.

## Entrada com a partida em andamento

- `members/{uid}` pode ser escrito pelo próprio também durante a partida (antes: só no lobby). Só a
  validade (`expiresAt`) limita.
- Quem está na sala, online e sem assento, entra numa fila no anfitrião e assume o lugar de um **bot
  sorteado** no começo da mão seguinte (depois do resultado e da distribuição de pontos). Sem bot na
  mesa, espera. Sair da sala tira da fila.
- O lobby mostra **quem está na sala** (sentado ou não): `members/{uid}` passou de `true` para
  `{ displayName, avatar, photoURL? }`, legível por membros e anfitrião. Começar com alguém sem
  assento pede confirmação.

## Fotos e fim de partida

- Assentos e membros levam `photoURL` quando o avatar escolhido é a foto da conta. As regras aceitam
  só `https://*.googleusercontent.com/` (o CSP já só carrega imagens desse domínio).
- Ao fim, a meta vai para `ended`; o resultado final oferece **"Voltar à sala"** (código, assentos,
  começar de novo). O anfitrião leva todos de volta; o convidado volta sozinho e espera.
- `PROTOCOL_VERSION` passou para 2.

## Regras do banco

- Testes no emulador atualizados (`npm run test:rules`, Java 21+). **Pendente do desenvolvedor:**
  publicar as regras (`firebase deploy --only database`) junto com o site.
