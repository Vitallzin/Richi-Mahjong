# 0021 — Desempenho no celular: sons em MP3, precache menor e animações baratas

**Decisão** (substitui a parte de formato do ADR 0008):

- Sons em **MP3** mono 32 kHz (VBR ~90 kbps). `npm run sounds` sintetiza em WAV e comprime com o
  `ffmpeg`, que precisa estar no PATH. Total: de ~1,4 MB para ~140 KB.
- O **precache** do service worker não leva mais os sons nem o chunk do Firebase. Os dois são
  guardados na primeira vez em que são usados (CacheFirst): os sons ao começar uma partida, o
  Firebase ao entrar na conta. A primeira visita baixa ~1,6 MB a menos.
- **Relógio** da mesa: só o texto do tempo e o aviso de banco renderizam a cada leitura (200 ms). Antes,
  a mesa inteira renderizava 5 vezes por segundo.
- **Animações** contínuas das pedras (halo de dora, destaque de cópias, reflexo) animam só `opacity` e
  `transform`. Antes, `box-shadow` e `left` repintavam ou refaziam o layout a cada quadro.
- **Transição entre telas** sem `filter: blur`, mais curta (cerca de 300 ms), e espera de no máximo 350 ms
  pela tela nova.

**Por quê:** no celular, o site estava pesado e as animações demoravam. MP3 toca em todos os navegadores
(inclusive iPhone) sem precisar de um segundo formato.

**Consequência:** sem rede, quem nunca jogou uma partida fica sem sons até a primeira partida com rede.
Sem rede e sem o Firebase no cache, a conta abre como visitante; a marca de login continua, e a conta
volta na próxima abertura com rede.
