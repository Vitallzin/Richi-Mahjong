# 0017 — Fase 5: Aparência, conta, histórico e salas privadas

Liberada pelo desenvolvedor em 19/10/2026 (com a Aparência antecipada, ADR 0014).

## Aparência

- Quatro eixos independentes (cenário, feltro, faces, verso) como conjuntos de variáveis CSS
  (`src/theme/appearance.ts`), aplicados no `<html>`. Os "theme.json" da spec 11.2 viraram dados TS
  tipados (`facesType: 'css'`); trocar arte final continua sem mexer em componentes.
- 4 cenários, 5 feltros, 3 faces, 5 versos, prévia ao vivo. Preferência local (não sincroniza em sala;
  sincroniza entre aparelhos com a conta, junto das outras preferências).

## Conta e histórico

- O Firebase só é baixado quando o jogador entra (ou já tinha entrado neste aparelho): chunk separado.
- Primeiro login com preferências locais personalizadas: pergunta se vão para a conta (12.3). Depois,
  cada mudança é gravada em `users/{uid}/settings` (com atraso de 800 ms).
- Perfil: nome sanitizado (≤ 24) e 12 avatares temáticos em hanzi ou a foto da conta Google.
- Histórico: resumo (spec 12.4) gravado por cada jogador ao fim da partida, solo ou sala; `endedAt` vem do
  relógio do servidor (as regras exigem `≤ now`). Limite de 100. O banco não guarda listas vazias, então o
  resumo é normalizado ao ler. As vitórias da partida ficam salvas junto com o autosave.

## Salas privadas (spec 13)

- `HostSession` estende a sessão local (relógio por assento, tolerância de rede de 1 s, bot "Sora Normal"
  cobrindo convidado ausente); `GuestSession` só renderiza a visão recebida. Ambas falam com um
  transporte abstrato (testado em memória); o transporte real está em `src/net/room.ts`.
- **Visão e eventos trafegam como JSON em texto** dentro de `private/{uid}`: o Realtime Database apaga
  listas vazias e nulos, o que quebraria a `PlayerView`.
- **Pedidos do lobby pelo inbox** (`claimSeat`/`leaveSeat`): como só o anfitrião escreve os assentos
  (regra da spec), o convidado pede e o anfitrião aplica.
- `seq` da publicação começa no relógio do anfitrião: se ele recarregar, a numeração continua crescendo
  e os convidados não descartam as visões novas. O anfitrião retoma do autosave local da sala.
- Sala **não pausa** por um jogador (apresentação e janela de sair continuam com a mesa andando).
- Ao criar uma sala, o anfitrião apaga as anteriores dele (13.8).

## Regras do banco (acréscimos à spec 13.7)

- `rooms/$code/.write`: o anfitrião pode **apagar** a sala inteira (só remoção).
- Leitura do nó `members` e do nó `inbox` inteiros pelo anfitrião (ele precisa ver quem entrou e todos os
  pedidos), e de `presence` inteiro por membros e anfitrião.
- Testadas no emulador em `tests/rules/` (`npm run test:rules`): visão de outro não é legível, ninguém
  lista salas, inbox validado, entrar só no lobby, só o anfitrião apaga, login não-Google não escreve.
- **Pendente do desenvolvedor:** publicar as regras (`firebase deploy --only database`).

## Desenvolvimento

- `npm run emulators` (Auth + Database; Java 21+), `npm run dev:emulators` (porta 3100, modo
  `emulators`) e `__devSignIn(uid, nome)` no console: login de teste aceito só pelo emulador.
