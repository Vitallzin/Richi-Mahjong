# Riichi Mahjong em Português — Especificação Técnica

> **Documento de implementação para o Claude Code.**
> Versão 1.4 — 11/10/2026 — Projeto pessoal / portfólio. (v1.4: decisões do desenvolvedor incorporadas — tempo/banco, agari-yame configurável, vermelhas do sanma, 3 personagens, sem sugestão de descarte; região do banco corrigida. v1.3: tela avançada do sanma confirmada por print, resultado final = só ranking, pendências reorganizadas em 3 categorias. v1.2: tela de configuração alinhada às telas reais do Mahjong Soul — básico + avançado, tempos pré-definidos, novas opções; regras do sanma corrigidas com as telas oficiais de regras do jogo: kita, muro morto, tsumo-loss opcional, bônus de colocação.)
> Substitui e expande o `riichi_mahjong_documento_conceito.docx`. Em caso de conflito, **este documento prevalece**.

---

## 0. Como usar este documento

### 0.1 Ordem de trabalho

1. Leia o documento inteiro uma vez antes de escrever código.
2. Trabalhe **fase por fase** (seção 15). Não implemente nada de uma fase futura antes de a atual passar nos critérios de aceitação.
3. Ao fim de cada fase: testes passando, `typecheck` e `lint` limpos, app implantável.
4. Quando encontrar um item marcado com 🔶 ou ❓, **pare e confirme com o desenvolvedor** (ou verifique na fonte indicada) antes de fixar o valor no código. Todo valor confirmado deve ser registrado em `docs/adr/` (uma linha por decisão).

### 0.2 Legenda de status das regras

| Marca | Significado |
|---|---|
| ✅ | Confirmado em fonte/print do Mahjong Soul, **decidido pelo desenvolvedor**, ou **convenção padrão adotada** (assim indicado na linha) |
| 🔶 | Provável (padrão Tenhou/Mahjong Soul pelo que se sabe), **precisa ser verificado** antes de fixar |
| ❓ | Decisão de produto ainda aberta |

### 0.3 Regras de conduta para o Claude Code

- TypeScript em modo `strict`. Proibido `any` (use `unknown` + validação).
- Identificadores de código em **inglês**; textos de interface, tutorial e mensagens em **português do Brasil**, sempre via camada de i18n (nunca strings soltas em componentes).
- O diretório `src/engine/` **não pode importar** React, Firebase, DOM, Zustand nem nada fora de `src/engine/`. Isso é imposto por regra de lint (seção 5.1).
- Ajudas (`src/help/`) e bots (`src/bots/`) só recebem `PlayerView` (seção 5.3), **nunca** o estado completo da partida. Isso garante por tipo que não há trapaça nem vazamento de informação oculta.
- Toda ação é validada pelo motor. A interface nunca decide se uma jogada é legal por conta própria.
- Não copiar nenhum asset (arte, sons, textos, ícones) do Mahjong Soul ou de qualquer outro jogo. Regras e fluxo de jogo são livres; apresentação visual e sonora é original.
- Todo asset de terceiros (fonte, som, ícone) deve constar em `CREDITS.md` com licença e URL.
- Commits pequenos, mensagens em português ou inglês (escolha uma e mantenha), um ADR curto para cada decisão não óbvia.

---

## 1. Visão geral

Site jogável de **Riichi Mahjong (mahjong japonês)** totalmente em **português do Brasil**, inspirado em regras e fluxo do **Mahjong Soul**, com um **guia integrado e opcional** ("colinha") que ajuda iniciantes a aprender sem jogar pelo usuário.

**Objetivos do projeto**

1. Servir para o desenvolvedor **aprender a jogar** e jogar com amigos.
2. Servir de **portfólio**: motor de regras bem testado, arquitetura limpa, interface cuidada.
3. Ser **barato**: rodar inteiramente no plano gratuito do Firebase (Spark).

**Modos de uso**

- **Solo contra bots** (3 ou 4 jogadores), offline-capaz, com ou sem login.
- **Salas privadas com amigos** (3 ou 4 jogadores, lugares vazios preenchidos por bots), apenas por código/link de convite e apenas com login Google. **Não existe matchmaking aleatório.**

**Princípios de fidelidade e justiça (herdados do conceito, inegociáveis)**

- As ajudas são opcionais e **não mudam as regras**.
- O guia só usa informação que o jogador **poderia conhecer legitimamente** (sua mão, descartes públicos, chamadas, indicadores de dora).
- Nunca revelar mãos ocultas nem a ordem das peças do muro. **Única exceção:** o **modo treino "Mostrar mãos"** (opcional, explícito, só em partidas solo contra bots; ver 9.7).
- Nunca manipular a distribuição para ajudar ou atrapalhar o jogador.
- A dificuldade dos bots altera a **qualidade das decisões**, nunca as regras nem a aleatoriedade. Bots não enxergam mãos ocultas.
- Toda ação é validada pelo conjunto de regras selecionado.
- Mensagens distinguem claramente: **mão completa**, **tenpai**, **yaku válido**, **No Yaku** e **possibilidade real de vitória**.

---

## 2. Decisões de produto já fechadas

| Tema | Decisão |
|---|---|
| Regras base | Fiéis ao **Mahjong Soul (partida ranqueada)**, para yonma e sanma. Detalhes na seção 6 |
| Modalidades | Yonma (4 jogadores) e Sanma (3 jogadores), ambos na v1 |
| Duração | **Uma mão** (ikkyoku), **só Leste** (tonpuusen) e **Leste-Sul** (hanchan), todos na v1 |
| Personalização de regras | Tela de criação de partida no estilo da sala amistosa do Mahjong Soul: **básico** (modalidade, duração, tempo, adversários) + chave **"Configurações avançadas"** (desativadas = regras padrão). Avançadas: pontos iniciais, pontos mínimos para vencer, quebra (tobi), peças vermelhas, tanyao aberto, han mínimo, kiriage mangan, modo treino. Nuki-dora (kita) **fixo e ligado** no sanma (✅ o Mahjong Soul não oferece chave para isso); **tsumo-loss** ligável/desligável no sanma. Ver 6.3 e 6.6 |
| Tempo por jogada | **Padrão 5+20.** Atalhos iguais aos do Mahjong Soul (3+5, 5+10, 5+20, 60+0, 300+0) + **Ilimitado** + **Personalizado** (segundos por jogada e de banco, à escolha do jogador). Ver 10.4 |
| Bots | 3 níveis (Fácil / Normal / Difícil) × personagens com estilo próprio. **Estilo e força são eixos independentes** |
| Multiplayer | Somente salas privadas, modelo **anfitrião como servidor**, Firebase Spark |
| Login | **Convidado** (sem login, só solo, sem histórico) e **Google** (perfil, histórico, salas) |
| Histórico | Apenas **resumo** de cada partida (sem replay) |
| Avatar | Avatares temáticos do jogo **ou** foto da conta Google (sem upload de imagem — Cloud Storage exige plano Blaze desde 03/02/2026) |
| Loja / progressão | **Não existe.** Tudo desbloqueado desde o início |
| Visual | 2D com perspectiva suave (2.5D), tema padrão **"Noite de Sakura"** (conceito em `docs/concept/`), pedras em camadas para permitir temas |
| Plataformas | PC e celular. **Partida sempre em paisagem** (trava de orientação no Android; rotação por CSS no iPhone) |
| Som | Efeitos sonoros (pedras, chamadas, riichi, vitória etc.). **Sem música** |
| Idioma | Português do Brasil. Termos japoneses (riichi, ron, tsumo, chi, pon, kan, dora, yaku, tenpai, furiten) mantidos e explicados |
| Stack | React + TypeScript + Vite, Zustand, Vitest, Firebase (Hosting, Auth Google, Realtime Database) |

---

## 3. Stack tecnológica

| Camada | Tecnologia | Observação |
|---|---|---|
| Build / dev | **Vite** + React 18+ + **TypeScript strict** | |
| Estado de UI | **Zustand** | Preferências, sessão da partida, ajudas |
| Roteamento | React Router | Rotas na seção 10.1 |
| Testes | **Vitest** (+ Testing Library para UI, `@firebase/rules-unit-testing` para regras do banco) | |
| Estilo | CSS Modules **ou** Tailwind — escolher um na Fase 0 e registrar em ADR | Tokens de tema via variáveis CSS |
| Animação | Framer Motion (opcional, Fase 6) ou CSS puro | Respeitar `prefers-reduced-motion` |
| Áudio | **Howler.js** | |
| Backend | **Firebase**: Hosting, Authentication (Google), Realtime Database | Plano **Spark** (gratuito). Sem Cloud Functions, sem Cloud Storage |
| PWA | `vite-plugin-pwa` | Cache dos assets para jogar offline após o 1º acesso |
| Qualidade | ESLint (+ `eslint-plugin-boundaries` ou `no-restricted-imports`), Prettier, `tsc --noEmit` | |
| CI/CD | GitHub Actions: lint + typecheck + testes; deploy no Firebase Hosting na `main` | |
| Bots pesados | **Web Worker** para o bot Difícil | Evita travar a UI |

**Não usar:** canvas/WebGL/motor de jogo (a mesa é HTML+CSS+SVG), Redux, bibliotecas de mahjong prontas para a lógica de regras (o motor próprio é o coração do portfólio; bibliotecas existentes só podem ser usadas como **referência para comparar resultados em testes**).

---

## 4. Estrutura do repositório

```
/
├─ docs/
│  ├─ spec.md                      # este documento
│  ├─ concept/                     # imagem de conceito (referência visual, NÃO é spec de regras)
│  └─ adr/                         # decisões registradas, uma por arquivo curto
├─ public/
│  ├─ manifest.webmanifest
│  └─ icons/
├─ src/
│  ├─ engine/                      # TypeScript PURO. Zero dependências externas de UI/rede
│  │  ├─ tiles/                    # tipos, notação (1m..7z, 0m/0p/0s), contagem, utilitários
│  │  ├─ rng/                      # PRNG com semente + embaralhamento
│  │  ├─ rules/                    # definições (dados), presets, validação de combinações
│  │  ├─ hand/                     # decomposição, shanten, esperas, agari
│  │  ├─ yaku/                     # um módulo por yaku + registro
│  │  ├─ scoring/                  # fu, han, limites, pagamentos, honba, riichi sticks
│  │  ├─ game/                     # estado, ações, legalActions, apply, fluxo de mão e de partida
│  │  ├─ view/                     # getPlayerView (redação de informação oculta)
│  │  └─ index.ts
│  ├─ bots/
│  │  ├─ policy.ts                 # interface BotPolicy
│  │  ├─ skill/                    # easy.ts, normal.ts, hard.ts
│  │  ├─ characters/               # personagens (retrato, nome, frase, parâmetros de estilo)
│  │  └─ worker.ts                 # Web Worker
│  ├─ help/                        # ajudas (só PlayerView): esperas/restantes, no-yaku, regras, rótulos
│  ├─ session/                     # LocalSession, HostSession, GuestSession (seção 5.4)
│  ├─ net/                         # firebase init, auth, salas, transporte host<->guest
│  ├─ state/                       # stores Zustand (settings, perfil, sessão)
│  ├─ audio/                       # mapa evento->som, carregamento, volume
│  ├─ themes/                      # temas (faces, versos, feltro, fundo, tokens)
│  ├─ i18n/                        # strings pt-BR (estrutura pronta para outros idiomas)
│  ├─ content/tutorial/            # capítulos do tutorial em Markdown
│  ├─ ui/
│  │  ├─ components/               # Tile, Hand, DiscardPond, MeldGroup, ActionBar, Dialogs...
│  │  ├─ table/                    # Mesa, painel central, HUD, placar
│  │  └─ screens/                  # Menu, Configurar partida, Tutorial, Ajudas, Perfil, Histórico, Salas
│  └─ main.tsx
├─ tests/                          # testes de integração e simulações (unitários ficam ao lado do código)
├─ database.rules.json
├─ firebase.json
├─ CREDITS.md
└─ CLAUDE.md                       # resumo curto para o agente (modelo na seção 17.1)
```

---

## 5. Arquitetura

### 5.1 Camadas e regra de dependência

```
ui  ─►  session  ─►  engine
 │         │            ▲
 │         ├─► bots ────┤   (bots e help consomem só PlayerView)
 │         └─► net ─────┘
 └─► help ──► engine (apenas tipos + funções puras sobre PlayerView)
```

- `engine` não importa de nenhuma outra pasta. Impor com lint (`no-restricted-imports`/`boundaries`).
- `ui` fala **somente** com `session` (interface `MatchSession`). Nunca chama `engine.applyAction` diretamente.
- `net` só existe na Fase 5. Até lá, `session/LocalSession` cobre tudo.

### 5.2 Motor: estado, ações, eventos

O motor é uma **máquina de estados determinística**:

```ts
applyAction(state: MatchState, seat: Seat, action: Action): { state: MatchState; events: GameEvent[] }
getLegalActions(state: MatchState, seat: Seat): LegalActions
getPlayerView(state: MatchState, seat: Seat): PlayerView
```

- Funções puras, estado imutável (cópia estrutural ou `immer`), sem relógio interno e sem `Math.random`.
- Todo estado é **serializável em JSON** (necessário para autosave, para o anfitrião persistir a sala e para depuração).
- `events` alimenta animações, sons e log de partida (ex.: `TileDrawn`, `TileDiscarded`, `RiichiDeclared`, `CallMade`, `DoraRevealed`, `HandWon`, `ExhaustiveDraw`, `AbortiveDraw`, `MatchEnded`).

**Esboço de tipos (ajustar ao implementar, manter a ideia):**

```ts
type Suit = 'm' | 'p' | 's' | 'z';
type TileKind = number;            // 0..33 (0-8 m, 9-17 p, 18-26 s, 27-33 z)
type Tile = { id: number; kind: TileKind; red: boolean }; // id 0..135, instância física
type Seat = 0 | 1 | 2 | 3;         // 0 = assento inicial do Leste
type Mode = 'yonma' | 'sanma';

type Meld =
  | { type: 'chi'; tiles: Tile[]; called: Tile; from: Seat }
  | { type: 'pon'; tiles: Tile[]; called: Tile; from: Seat }
  | { type: 'daiminkan'; tiles: Tile[]; called: Tile; from: Seat }
  | { type: 'kakan'; tiles: Tile[]; added: Tile; from: Seat }
  | { type: 'ankan'; tiles: Tile[] };

type Action =
  | { type: 'discard'; tile: Tile; riichi?: boolean }
  | { type: 'tsumo' }
  | { type: 'ron' }
  | { type: 'chi'; use: [Tile, Tile] }
  | { type: 'pon'; use: [Tile, Tile] }
  | { type: 'daiminkan' }
  | { type: 'ankan'; kind: TileKind }
  | { type: 'kakan'; tile: Tile }
  | { type: 'kita' }                      // sanma: nuki-dora
  | { type: 'kyuushuKyuuhai' }
  | { type: 'pass' }
  | { type: 'ackSummary' };               // jogador viu o resumo da mão

type Phase =
  | 'awaitingDiscard'      // jogador da vez comprou e deve agir
  | 'awaitingCalls'        // alguém descartou; seats elegíveis respondem
  | 'awaitingRobbery'      // kakan/ankan/kita abertos a ron (chankan; no kita, ron SEM yaku de chankan)
  | 'handSummary'          // mão encerrada, mostrando resultado
  | 'matchEnded';
```

**Resolução de chamadas simultâneas.** Em `awaitingCalls`, o motor coleta a resposta de **todos** os seats elegíveis (ron / pon / kan / chi / pass) e só resolve quando todos responderam ou o tempo acabou (timeout = `pass`). Prioridade: **ron > pon/kan > chi**. Ron múltiplo é permitido (seção 6).

> A UI e a sessão devem inserir um atraso artificial e variável nas respostas dos bots (≈ 400–1500 ms) para que a **velocidade da resposta não vaze** se o bot tem ou não uma chamada. Isso é responsabilidade da camada `session`, não do motor.

### 5.3 `PlayerView` — a barreira contra informação oculta

`getPlayerView(state, seat)` devolve **somente** o que aquele jogador pode saber:

- Sua própria mão (com peças vermelhas), sua peça comprada, suas ações legais.
- De **todos**: pontos, descartes (com marca de riichi e de peça chamada), chamadas (melds) expostas, quantidade de peças na mão, estado de riichi, kita declarados, vento da rodada/assento, número da rodada, honba, bastões de riichi.
- Mesa: indicadores de dora **revelados**, quantidade de peças restantes no muro vivo.
- **Nunca**: mãos dos outros, ordem do muro, peças do muro morto não reveladas, ura-dora antes do fim da mão, quem tem ou não chamada disponível durante `awaitingCalls`.
- **Exceção única (modo treino, 9.7):** existe uma função **separada** `getTrainingView(state, seat)`, usada apenas pela `LocalSession` quando o jogador ativa "Mostrar mãos" em partida solo. Ela nunca é entregue a bots, a `help/` nem a `GuestSession`; `PlayerView` continua sem vazamentos.

**Todas** as funções de `help/` e `bots/` têm assinatura que aceita `PlayerView` e não `MatchState`. Testes de tipo/lint devem impedir importar `MatchState` nesses módulos.

### 5.4 Sessões (um fluxo, três transportes)

A UI conversa com uma interface única:

```ts
interface MatchSession {
  getView(): PlayerView;                       // visão do jogador local
  subscribe(cb: (view: PlayerView, events: GameEvent[]) => void): () => void;
  submit(action: Action): void;                // ação do jogador local
  // metadados: rules, settings, seats (humano/bot/personagem), relógio
}
```

| Implementação | Quando | O que faz |
|---|---|---|
| `LocalSession` | Solo (Fase 2+) | Roda o motor e os bots no navegador. Sem rede |
| `HostSession` | Anfitrião de sala (Fase 5) | Igual à `LocalSession`, **mais** envia `PlayerView`s aos convidados e recebe ações via transporte |
| `GuestSession` | Convidado de sala (Fase 5) | Não roda motor. Renderiza `PlayerView`s recebidas e envia ações |

Consequência: **o modo solo é uma sala só com bots, sem rede**. O motor é escrito uma vez.

### 5.5 Aleatoriedade e determinismo

- PRNG com semente (ex.: `sfc32` ou `mulberry32`) em `engine/rng/`. A semente de cada mão é gerada com `crypto.getRandomValues` (no anfitrião/solo) e **guardada no estado** (permite reproduzir uma mão em testes e depuração).
- Embaralhamento Fisher-Yates sobre as peças. **Nenhum viés** por dificuldade, jogador ou situação de placar.
- Bots recebem o RNG como parâmetro (decisões com ruído ficam reproduzíveis em teste).

### 5.6 Autosave

- Solo: após cada ação, serializar `MatchState` + `rules` + `seatsConfig` em IndexedDB (ou `localStorage` se pequeno). Ao abrir o site, oferecer **"Continuar partida"**.
- Sala (anfitrião): mesmo mecanismo — se o anfitrião fechar a aba, consegue retomar (seção 13.6).
- Versionar o formato salvo (`schemaVersion`) e descartar com aviso saves incompatíveis.

---

## 6. Regras do jogo (preset "Padrão" = Mahjong Soul ranqueado)

### 6.1 Estrutura: regras fixas + poucas opções

- **Regras fixas:** definidas em `engine/rules/presets.ts` como **uma constante por modalidade** (`PRESET_YONMA`, `PRESET_SANMA`). É a **referência única** para motor e testes. Nada de números mágicos espalhados.
- **Opções personalizáveis:** só as da seção 6.3. Tudo o mais é fixo (não expor no painel — seria enorme e confuso para quem está aprendendo).
- O conjunto de regras é **congelado** (`Object.freeze`, `readonly`) no início da partida e guardado no estado. Não muda durante a partida; em sala, é enviado aos convidados ao entrar.

### 6.2 Tabela das regras fixas

Fontes para conferência: `https://riichi.wiki/Mahjong_Soul`, `https://riichi.wiki/Comparison_of_popular_rulesets`, regulamento de torneio do Mahjong Soul (`https://mahjongsoul.yo-star.com/tournament/rules.pdf`). O riichi.wiki bloqueia acesso automatizado: se não conseguir abrir, **peça ao desenvolvedor** para conferir manualmente.

| Regra | Yonma | Sanma | Status |
|---|---|---|---|
| Pontuação inicial (**padrão**; personalizável em Avançado: 100 a 200.000) | 25.000 | 35.000 | ✅ (tela do MS / riichi.wiki) |
| Pontos mínimos para vencer / alvo ("Min Points to Win"; **padrão**; personalizável em Avançado: 100 a 200.000). Na última mão, se o 1º colocado tem menos que isso, a partida **se estende** | 30.000 | 40.000 | ✅ (telas do MS, yonma e sanma) |
| Oka | Não | Não | ✅ |
| Desempate de colocação | Prioridade de assento: **Leste inicial (0) > Sul inicial (1) > Oeste (2) > Norte (3)**. Mesma regra na classificação final e na exibição | idem | ✅ decisão do desenvolvedor |
| Tobi ("Busting") | Encerra quando alguém fica **abaixo de 0** (não "igual a 0") | idem | ✅ (opção; padrão ligado, como na sala amistosa do MS) |
| Kiriage mangan | Desligado | Desligado | opção **nossa** (não aparece no menu do MS; mantida por pedido do desenvolvedor) |
| Kuitan ("Open Tanyao") e atozuke | Ligado / permitido | idem | ✅ (kuitan é opção, ligado por padrão no MS; atozuke fixo permitido) |
| Peças vermelhas (aka dora) | Opções **0 / 3 / 4**, padrão **3** (um 5 de cada naipe; **4** = um 5m, **dois** 5p, um 5s) | Opções **0 / 2**, padrão **2**: **um 5p e um 5s** vermelhos; **sem** 5m vermelho. Cada vermelho vale +1 han, acumulando com as demais dora | ✅ (telas do MS + decisão do desenvolvedor) |
| Ura-dora, kan-dora, kan-ura, ippatsu | Sim | Sim | ✅ |
| Riichi: custo | 1.000 pontos (precisa ter ≥ 1.000) | idem | ✅ |
| Riichi: exige ≥ 4 peças no muro vivo | Sim | Sim | ✅ convenção adotada |
| Bastão de honba | 300 por honba (ron); tsumo = 100 de cada pagador | 300 (ron); tsumo = 100 de cada pagador | ✅ yonma / ✅ sanma **provisório** (decisão do desenvolvedor: 300; constante configurável `honbaRon` por modalidade; as fontes divergem, conferir no jogo quando possível) |
| Ron múltiplo (double/triple) | **Permitido**. Bastões de riichi e honba vão para o vencedor mais próximo do descartador na ordem de turno (atamahane) | idem | ✅ |
| Ron triplo como empate abortivo | **Não** (todos vencem) | n/a | ✅ |
| Bastões de riichi sobrando no fim da partida | Vão para o 1º colocado | idem | ✅ |
| Empates abortivos | Kyuushu kyuuhai, suufon renda, suukaikan, suucha riichi | Kyuushu kyuuhai, suukaikan | ✅ yonma / ✅ sanma (convenção adotada: sem suucha riichi nem suufon renda, pois há 3 jogadores) |
| Nagashi mangan | Sim | Sim | ✅ (regulamento MS: "Mangan at Draw: Yes") |
| Renhou | Não | Não | ✅ |
| Tenhou / Chiihou | Sim (yakuman) | Sim | ✅ |
| Kazoe yakuman (13+ han) | Sim | Sim | ✅ convenção adotada |
| Yakuman duplo | Kokushi 13 esperas, suuankou tanki, chuuren 9 esperas, daisuushii | idem | ✅ convenção adotada (daisuushii duplo, como no Tenhou) |
| Pao | Daisangen e daisuushii. **Sem** pao de suukantsu nem de rinshan na v1 | idem | ✅ decisão do desenvolvedor |
| Agari-yame na última mão | Opção `agariYame`, padrão **ligado**; ligada = encerra a partida **automaticamente**. **Tenpai-yame não é implementado na v1** (dealer tenpai no empate da última mão repete normalmente) | idem | ✅ decisão do desenvolvedor |
| Extensão (ninguém atingiu o alvo ao fim da última rodada prevista) | Leste→Sul; Leste-Sul→Oeste. **Encerra forçado ao fim de Oeste 4** | idem | ✅ |
| Kan fechado durante riichi | Permitido se **não alterar as esperas** (e a peça não faz parte de uma sequência em nenhuma leitura da mão) | idem | ✅ convenção adotada (Tenhou) |
| Dora do kan aberto/kakan | Revelada **após o descarte** seguinte; ankan revela **imediatamente** | idem | ✅ convenção adotada |
| Chankan sobre ankan | Só para kokushi musou | idem | ✅ convenção adotada |
| Kuikae (trocar a peça imediatamente após chamar) | **Proibido** (mesma peça e peça do outro extremo da sequência) | n/a no chi | ✅ padrão |
| Furiten | Padrão: permanente, temporário e de riichi | idem | ✅ padrão |
| Yaku locais ("Local Yaku") | Desligados. O MS oferece a chave, mas **não será oferecida na v1** (implica um conjunto grande de yaku extras; ver 16) | idem | ✅ |
| Chombo (infração) | **Não existe**: ações ilegais simplesmente não são oferecidas | idem | decisão de projeto |
| Pontuação de tsumo no sanma | — | **Tsumo-loss** ligado por padrão (a parte do 4º jogador ausente não é cobrada). Opção `tsumoLoss`: desligada ⇒ **north-bisection** (a parte do ausente é dividida entre os 2 pagadores) | ✅ (tela avançada do sanma: Tsumo Loss Enable por padrão; tela de regras: pode ligar/desligar) |
| Pagamento de noten (tenpai no empate) | 3.000 no total, dividido entre tenpai e noten | 3.000 | ✅ yonma / ✅ sanma **provisório** (decisão do desenvolvedor: 3.000; constante configurável `notenTotal` por modalidade; as fontes divergem, conferir no jogo quando possível) |
| "Tenpai" para noten | Tenpai de forma (**não** exige yaku). Karaten (espera sem nenhuma cópia restante) **conta como tenpai** | idem | ✅ convenção adotada |
| Tempo (padrão 5+20) | **5 s por jogada** (voltam a cada jogada) + **banco de 20 s**: o excedente dos 5 s é descontado do banco; o banco só diminui e volta a 20 s no início de cada mão ("rodada", ver 10.4). Exibido como `5-19` (jogada-banco). Personalizável | idem | ✅ decisão do desenvolvedor (não verificado no MS) |

### 6.3 Opções personalizáveis (v1)

Modelo: as telas do Mahjong Soul têm um bloco **básico** e uma chave **"Configurações avançadas"** (Desativar/Ativar). Aqui é igual: com avançadas **desativadas** vale o preset padrão da modalidade; **ativadas**, aparecem as opções abaixo, já pré-selecionadas com os padrões.

Cada opção é **dado**, não código de interface:

```ts
type RuleOption<T> = {
  id: string;                           // 'kuitan'
  label: string;                        // chave i18n
  description: string;                  // chave i18n (efeito explicado em 1-2 frases)
  kind: 'boolean' | 'enum' | 'number';
  values?: readonly T[];                // boolean/enum: valores possíveis
  range?: { min: number; max: number; step: number }; // number
  default: Record<Mode, T>;             // padrão por modalidade
  modes: readonly Mode[];               // modalidades em que a opção existe
  group: 'basic' | 'advanced';          // onde aparece na tela
  locked?: Partial<Record<Mode, T>>;    // valor fixo (exibir desabilitado com explicação)
  requires?: (rules: Partial<RuleSet>) => boolean; // dependências
};
```

| id | Grupo | Tipo | Yonma | Sanma | Descrição (resumo para a interface) |
|---|---|---|---|---|---|
| `length` | básico | enum `oneHand \| east \| south` | padrão **south** | padrão **south** | Duração: **uma mão**, só Leste, ou Leste-Sul |
| `startingPoints` | avançado | number 100–200.000, passo 100 | padrão **25.000** | padrão **35.000** | Pontos de cada jogador no início |
| `targetPoints` | avançado | number 100–200.000, passo 100 | padrão **30.000** | padrão **40.000** ✅ | Pontos mínimos para vencer: na última mão, se o 1º tem menos que isso, a partida se estende para o próximo vento |
| `tobi` | avançado | boolean | padrão **ligado** | padrão **ligado** | Encerra a partida se alguém ficar com menos de 0 pontos |
| `agariYame` | avançado | boolean | padrão **ligado** | padrão **ligado** | Na última mão, se o dealer **vence** estando em 1º com pontos ≥ alvo, a partida **encerra automaticamente**. Desligado: a mão repete (renchan) normalmente. Tenpai-yame **não** existe na v1 |
| `akaDora` | avançado | enum | `0`, `3` ou `4` (padrão **3**) | `0` ou `2` (padrão **2**) ✅ | Quantidade de cincos vermelhos; cada um vale +1 dora |
| `kuitan` | avançado | boolean | padrão **ligado** | padrão **ligado** | Permite tanyao (só peças 2–8) com a mão aberta |
| `hanMinimum` | avançado | enum `1 \| 2 \| 4` | padrão **1** | padrão **1** | Han mínimo para poder vencer (ainda é preciso ter yaku). 1 = sem restrição extra. Yakuman sempre vale. dora/aka/ura contam para o mínimo (decisão 16.B.5) |
| `kiriageMangan` | avançado | boolean | padrão **desligado** | padrão **desligado** | Arredonda 4 han/30 fu e 3 han/60 fu para mangan (8.000 / 12.000 do dealer). *Opção nossa; não existe no menu do MS* |
| `tsumoLoss` | avançado | boolean | não existe | padrão **ligado** ✅ | Ligado: tsumo rende menos porque a parte do 4º jogador ausente não é cobrada. Desligado: essa parte é dividida entre os dois pagadores (north-bisection) |
| `nukiDora` | avançado | boolean | não existe | **locked: ligado** (✅ não há chave no MS) | Norte retirado (kita) vale +1 dora (ver 7.13) |

Fora do motor (ficam em `MatchSettings`, separado de `RuleSet`):

- **Tempo por jogada** (10.4), **dificuldade/personagens dos bots** (8.3), **ajudas da partida** (9) e **modo treino "Mostrar mãos"** (9.7).
- O menu do MS também mostra "Tips" (dicas) e "Computer" (dificuldade do bot): no nosso jogo, "Tips" corresponde ao nosso sistema de **ajudas** (liga/desliga por ajuda) e "Computer" à dificuldade do bot (Fácil/Normal/Difícil).

### 6.4 Validação de combinações

`validateRules(mode, selection): { valid: boolean; issues: Issue[] }` (função pura em `engine/rules/`):

- Rejeita opção que não existe na modalidade (ex.: `nukiDora` no yonma; `akaDora = 3` no sanma).
- Rejeita valor fora de `values` ou fora de `range` (pontos: entre 100 e 200.000, múltiplos de 100).
- **Avisos (não bloqueiam):** `targetPoints` menor ou igual a `startingPoints` ("a partida nunca será estendida"); `startingPoints` muito baixo com `tobi` ligado ("a partida pode acabar na primeira mão").
- Respeita `locked` e `requires`.
- Cada `Issue` traz `code` + chave i18n da mensagem (ex.: "Esta opção não existe no modo de 3 jogadores").
- A tela de configuração **gera os controles a partir da lista de `RuleOption`**; opções incompatíveis são ocultadas ou desabilitadas com explicação. Adicionar uma regra nova = adicionar um item na lista.
- Resumo final antes de iniciar: modalidade, duração, regras escolhidas (as que diferem do padrão em destaque), tempo, adversários.

### 6.5 Persistência das preferências de regras

- Salvar a **última seleção por modalidade**. "Restaurar padrão" volta ao preset.
- O botão "Regras padrão da modalidade" ignora a seleção salva e usa o preset.
- Com "Configurações avançadas" **desativadas**, vale sempre o preset (a seleção salva fica guardada, mas não é aplicada). Ao reativar, as escolhas anteriores reaparecem.

### 6.6 Estrutura da tela "Jogar partida" (inspirada nas telas do Mahjong Soul)

**Bloco básico (sempre visível):**

1. **Modalidade:** 4 jogadores / 3 jogadores.
2. **Duração:** Uma mão / Só Leste / Leste-Sul.
3. **Tempo por jogada:** `3+5` · `5+10` · **`5+20` (padrão)** · `60+0` · `300+0` · `Ilimitado` · `Personalizado` (ver 10.4).
4. **Adversários:** dificuldade (Fácil / Normal / Difícil) e personagem por assento ou "Aleatório" (8.3).
5. **Ajudas:** resumo das ajudas ativas + atalho para ajustar (9).
6. **Configurações avançadas:** `Desativadas` (padrão) / `Ativadas`.

**Bloco avançado (só aparece com "Ativadas"):** pontos iniciais · pontos mínimos para vencer · quebra (tobi) · agari-yame · peças vermelhas · tanyao aberto · han mínimo · arredondar mangan (kiriage) · tsumo-loss (sanma) · nuki-dora (sanma, travado) · **modo treino "Mostrar mãos"** (só solo; 9.7).

Cada controle mostra uma **descrição curta** (como o "?" do menu do MS), e o **resumo final** destaca o que difere do padrão. Opções que não existem na modalidade escolhida somem ou ficam desabilitadas com explicação.


---

## 7. Motor de regras — detalhamento

### 7.1 Peças

- 34 tipos × 4 cópias = 136 peças. Índices `0..33`: `0–8` manzu (1m–9m), `9–17` pinzu (1p–9p), `18–26` souzu (1s–9s), `27–33` honras (`1z` Leste, `2z` Sul, `3z` Oeste, `4z` Norte, `5z` Branco/Haku, `6z` Verde/Hatsu, `7z` Vermelho/Chun).
- Notação textual (usada em testes, logs e nomes de arquivo): `1m…9m`, `1p…9p`, `1s…9s`, `1z…7z`; cincos vermelhos: `0m`, `0p`, `0s`. Parser: `"123m456p789s11z"` ⇄ lista de peças.
- Peça vermelha é a **cópia 0** do 5 do naipe (quando habilitada pela quantidade de `akaDora`). Para análise de mão/esperas, vermelha e normal são do **mesmo tipo**; a diferença só importa para dora e para a janela de escolha de variante.
- Ordem de dora (indicador → dora): números `1→2→…→9→1` dentro do naipe; ventos `Leste→Sul→Oeste→Norte→Leste`; dragões `Branco→Verde→Vermelho→Branco`.
- Sanma: manzu `2m–8m` são removidos (restam 108 peças); `1m` e `9m` ficam, e a ordem de dora de manzu é `1m→9m` e `9m→1m`.

### 7.2 Muro

- Embaralhar as peças; formar **muro vivo** e **muro morto de 14 peças**.
- Muro morto: 4 peças de reposição (rinshan), 5 posições de indicador de dora e 5 de ura-dora (posições exatas são decisão de implementação; manter coerente e testar).
- Após distribuir 13 peças a cada jogador, o muro vivo tem **70 peças (yonma)** ou **55 (sanma)**; o Leste compra a 14ª.
- Cada kan: o jogador compra uma peça de reposição do muro morto e **uma peça do fim do muro vivo passa para o muro morto** (muro morto sempre com 14). Máximo de **4 kans por mão**.
- **Sanma:** o muro morto continua com 14 peças, mas comporta **8 reposições** (4 de kan + 4 de kita) em vez de 4, e o indicador de dora é a **5ª** peça a partir da quebra (em vez da 3ª). A cada **kan ou kita**, uma peça do fim do muro vivo passa para o muro morto. ✅ (tela de regras do MS: "8 Dead Wall tiles"; riichi.wiki/Sanma). A disposição física exata (onde ficam indicadores e ura) é detalhe de implementação, desde que coerente e testada.
- Haitei = última peça do muro vivo comprada normalmente. Houtei = descarte após a última compra. Peça de reposição **não** é haitei.

### 7.3 Início de mão

- Assentos fixos por partida. Ordem de turno **anti-horária**: Leste → Sul → Oeste → Norte. Quem está à sua **esquerda na mesa** (jogador anterior na ordem) é o único de quem você pode chamar **chi**.
- Vento da rodada: Leste (rodadas E1–E4) ou Sul (S1–S4) etc. Vento do assento muda a cada troca de dealer.
- Revelar o primeiro indicador de dora. Dealer compra a primeira peça.

### 7.4 Fluxo de turno

1. **Compra** do muro vivo (ou chamada, ou reposição pós-kan).
2. Ações possíveis do jogador da vez: `tsumo`, `riichi+descarte`, `ankan`, `kakan`, `kita` (sanma), `kyuushuKyuuhai`, `discard`.
3. Após o descarte, em `awaitingCalls`, os demais respondem (ron / pon / daiminkan / chi / pass).
4. Se ninguém chamar, passa a vez. Se alguém chamar, essa pessoa **descarta sem comprar** (exceto kan, que compra reposição).
5. Muro vivo vazio na hora de comprar ⇒ empate por exaustão (7.11).

### 7.5 Chamadas

- **Chi:** só da peça descartada pelo jogador anterior; forma sequência com 2 peças da mão. Se há mais de uma combinação possível (ex.: descarte `4m` com `2m3m`, `3m5m` ou `5m6m`; ou usando `5` normal vs `0` vermelho), a UI abre **janela de escolha de variante** (seção 10.5).
- **Pon:** de qualquer jogador; também com variante (usar o 5 vermelho ou o normal).
- **Daiminkan (kan aberto):** 3 peças da mão + descarte. **Kakan:** peça comprada vira 4ª de um pon já exposto. **Ankan:** 4 iguais na mão.
- **Kuikae:** depois de chi/pon, é proibido descartar (a) a mesma peça chamada e (b) no chi, a peça do outro extremo da sequência (ex.: chamou `4m` com `5m6m` ⇒ não descartar `4m` nem `7m`). Se isso deixar a mão sem descarte legal, a chamada **não é legal**.
- Nenhuma chamada em riichi (exceto ankan nas condições da 7.7). Chamadas só aparecem quando **legais**.
- **Kan não é permitido** se o muro vivo estiver vazio ou se já houve 4 kans na mão.

### 7.6 Kan e dora

- Cada kan revela um novo indicador (kan-dora). Ankan: imediatamente. Daiminkan/kakan: após o descarte seguinte (convenção adotada).
- Kan-ura conta para quem venceu em riichi.
- Kakan e ankan abrem **chankan** (7.9).
- Quatro kans: se feitos por **mais de um jogador** ⇒ `suukaikan` (empate abortivo ao fim do descarte do 4º kan). Se os 4 são do mesmo jogador, a mão segue (possível suukantsu).

### 7.7 Riichi

- Condições: mão **fechada** (ankan não abre), **tenpai** após o descarte, ≥ 1.000 pontos, ≥ 4 peças no muro vivo (convenção adotada).
- A declaração acontece **junto do descarte** (`discard { riichi: true }`). O bastão só é pago se o descarte **não** for vencido por ron. Se for, o riichi não se estabelece.
- Daburu riichi: riichi no primeiro descarte do jogador, sem nenhuma chamada anterior na mesa.
- Depois do riichi: só pode descartar a peça comprada (`tsumogiri`); não pode chi/pon/daiminkan; pode ankan **só** se não alterar as esperas (definição na tabela 6.2).
- Ippatsu: vitória até o fim de uma volta completa após o riichi, sem nenhuma chamada (chi/pon/kan de qualquer jogador; kita no sanma também quebra) no intervalo.
- **Comportamento de interface (configurável, ver 9.5):** (a) sugerir riichi com botão de confirmação (padrão); (b) declarar automaticamente **apenas** quando houver um único descarte que mantém o tenpai e a espera for inequívoca. Se houver mais de uma opção de descarte que mantém tenpai, **sempre** perguntar qual.

### 7.8 Furiten

- **Permanente:** alguma peça da sua espera está entre os seus próprios descartes (inclusive peças que outros chamaram). Só pode vencer por tsumo.
- **Temporário:** deixou passar uma vitória por ron (com yaku) ⇒ não pode ron até o seu próximo descarte.
- **De riichi:** em riichi, deixar passar um ron ⇒ furiten pelo resto da mão.
- A interface **não oferece Ron** quando furiten (e o guia pode avisar "Furiten" sem vazar informação oculta).

### 7.9 Vitória, yaku e leitura de mão

- Estruturas: 4 grupos + 1 par; **chiitoitsu** (7 pares distintos); **kokushi musou** (13 órfãos).
- Para um mesmo conjunto de peças, **calcular todas as leituras possíveis** (decomposições × posição da peça vencedora) e **escolher a de maior pontuação** (desempate: mais han, depois mais fu).
- Pelo menos **1 yaku** é obrigatório (dora, ura-dora e aka não são yaku). Com yaku exclusivos de tsumo (ex.: menzen tsumo), a mesma mão pode ser yaku-less por ron — calcular por tipo de vitória.
- Ron em kokushi sobre ankan (chankan) permitido (convenção adotada, 6.2).
- Sanankou: trinca completada **por ron** conta como aberta para sanankou/suuankou e para fu.

**Lista de yaku a implementar (v1 completa)** — `han` = fechada / aberta (`—` = só fechada)

| Yaku | PT (para a interface) | Han | Notas |
|---|---|---|---|
| Riichi | Riichi | 1 / — | |
| Ippatsu | Ippatsu | 1 / — | |
| Menzen tsumo | Tsumo fechado | 1 / — | |
| Tanyao | Tanyao | 1 / 1 se `kuitan` | só peças 2–8 |
| Pinfu | Pinfu | 1 / — | 4 sequências, par sem valor, espera ryanmen |
| Iipeikou | Iipeikou | 1 / — | duas sequências idênticas |
| Yakuhai | Yakuhai | 1 por trinca | dragões, vento da rodada, vento do assento (vento duplo = 2). **Sanma:** Norte nunca é yakuhai (✅ MS: "vento inútil") |
| Haitei raoyue | Haitei | 1 | tsumo na última peça |
| Houtei raoyui | Houtei | 1 | ron no último descarte |
| Rinshan kaihou | Rinshan | 1 | vitória na peça de reposição (**sanma:** inclui a reposição após **kita**, ✅ MS: "tsumo após kita é compra do muro morto") |
| Chankan | Chankan | 1 | ron sobre kakan (ankan só para kokushi, convenção adotada). **Sanma:** ron sobre a declaração de **kita** é permitido, mas **sem** yaku de chankan (7.13) |
| Daburu riichi | Riichi duplo | 2 / — | |
| Chiitoitsu | Chiitoitsu | 2 / — | 25 fu fixo |
| Sanshoku doujun | Sanshoku | 2 / 1 | mesma sequência nos 3 naipes |
| Ittsu | Ittsu | 2 / 1 | 123-456-789 no mesmo naipe |
| Chanta | Chanta | 2 / 1 | todo grupo tem terminal/honra, ao menos 1 sequência |
| Toitoi | Toitoi | 2 | 4 trincas/quadras |
| Sanankou | Sanankou | 2 | 3 trincas fechadas |
| Sanshoku doukou | Sanshoku doukou | 2 | mesma trinca nos 3 naipes |
| Sankantsu | Sankantsu | 2 | 3 quadras |
| Shousangen | Shousangen | 2 | 2 trincas de dragão + par do 3º |
| Honroutou | Honroutou | 2 | só terminais e honras |
| Honitsu | Honitsu | 3 / 2 | um naipe + honras |
| Junchan | Junchan | 3 / 2 | todo grupo com terminal, sem honras |
| Ryanpeikou | Ryanpeikou | 3 / — | duas vezes iipeikou |
| Chinitsu | Chinitsu | 6 / 5 | um só naipe |
| Nagashi mangan | Nagashi mangan | mangan | todos os descartes terminais/honras e nenhum chamado, no empate por exaustão |
| Kokushi musou | Kokushi musou | yakuman (duplo na espera de 13) | fechada |
| Suuankou | Suuankou | yakuman (duplo no tanki) | fechada |
| Daisangen | Daisangen | yakuman | pao |
| Shousuushii | Shousuushii | yakuman | |
| Daisuushii | Daisuushii | yakuman (duplo, convenção adotada) | pao |
| Tsuuiisou | Tsuuiisou | yakuman | só honras |
| Chinroutou | Chinroutou | yakuman | só terminais |
| Ryuuiisou | Ryuuiisou | yakuman | só verdes (2s 3s 4s 6s 8s e Hatsu) |
| Chuuren poutou | Chuuren poutou | yakuman (duplo na espera de 9) | fechada |
| Suukantsu | Suukantsu | yakuman | |
| Tenhou | Tenhou | yakuman | dealer vence na compra inicial |
| Chiihou | Chiihou | yakuman | não-dealer vence no 1º tsumo sem chamadas (**sanma:** kita conta como chamada e impede) |

Cada yaku vira um módulo com: identificação, função de detecção (`(ctx) => YakuResult | null`), testes próprios com mãos de exemplo positivas **e** negativas. Resultados de yaku trazem **nome PT + explicação curta** (usada pelo tutorial e pela tela de resultado).

### 7.10 Fu, han, limites e pagamentos

**Fu**

- Base **20**; **chiitoitsu 25 fixo**.
- +10 por ron com mão fechada. +2 por tsumo (exceto pinfu-tsumo).
- Grupos: trinca aberta 2 (simples) / 4 (terminal ou honra); trinca fechada 4 / 8; quadra aberta 8 / 16; quadra fechada 16 / 32.
- Par: dragão, vento da rodada, vento do assento = 2 (vento duplo = 4, convenção adotada).
- Espera: kanchan, penchan ou tanki = +2.
- Mão **aberta** que ficaria com 20 fu ⇒ **30 fu** (pinfu aberto). Arredondar para cima ao múltiplo de 10 (exceto 25 do chiitoitsu).

**Pontos básicos e limites**

`básico = fu × 2^(han+2)`, com teto:

| Condição | Nome | Básico |
|---|---|---|
| 5 han, ou 4 han/40+ fu, ou 3 han/70+ fu (ou `kiriageMangan`: 4 han/30 fu, 3 han/60 fu) | Mangan | 2.000 |
| 6–7 han | Haneman | 3.000 |
| 8–10 han | Baiman | 4.000 |
| 11–12 han | Sanbaiman | 6.000 |
| 13+ han (kazoe) ou yakuman | Yakuman | 8.000 (× nº de yakuman) |

**Pagamentos** (arredondar cada pagamento para cima ao múltiplo de 100):

- Ron: não-dealer = básico × 4; dealer = básico × 6.
- Tsumo não-dealer: dealer paga básico × 2, cada não-dealer paga básico × 1.
- Tsumo dealer: cada um paga básico × 2.
- **Honba:** +300 por honba no ron (+100 de cada pagador no tsumo). **Bastões de riichi** na mesa vão para o vencedor.
- Sanma, **tsumo-loss** (padrão): mesmos valores por pagador, mas só existem 2 pagadores (a parte do 4º ausente não é compensada). Com `tsumoLoss` desligado (**north-bisection**): a parte do 4º ausente é dividida entre os 2 pagadores (arredondando para cima a 100; convenção adotada).

**Valores de referência para testes (devem bater exatamente):**

| Mão | Não-dealer | Dealer |
|---|---|---|
| 1 han 30 fu, ron | 1.000 | 1.500 |
| 1 han 40 fu, ron | 1.300 | 2.000 |
| 1 han 50 fu, ron | 1.600 | 2.400 |
| 1 han 60 fu, ron | 2.000 | 2.900 |
| 2 han 30 fu, ron | 2.000 | 2.900 |
| 3 han 30 fu, ron | 3.900 | 5.800 |
| 4 han 30 fu, ron | 7.700 | 11.600 |
| 2 han 20 fu, tsumo (pinfu tsumo) | 400 / 700 | 700 todos |
| Chiitoitsu 2 han 25 fu, ron | 1.600 | 2.400 |
| Mangan | 8.000 (tsumo 2.000/4.000) | 12.000 (tsumo 4.000 todos) |
| Haneman | 12.000 (3.000/6.000) | 18.000 (6.000 todos) |
| Baiman | 16.000 (4.000/8.000) | 24.000 (8.000 todos) |
| Sanbaiman | 24.000 (6.000/12.000) | 36.000 (12.000 todos) |
| Yakuman | 32.000 (8.000/16.000) | 48.000 (16.000 todos) |

Fontes adicionais de conferência: calculadoras e tabelas públicas de pontuação; opcionalmente comparar resultados com uma biblioteca de pontuação existente **apenas em testes**.

### 7.11 Fim de mão

**Vitória (ron/tsumo):** calcular, pagar, transferir bastões, atualizar honba. Dealer vencedor ⇒ **renchan** (repete, honba +1). Caso contrário, honba volta a 0 e o dealer passa.

**Empate por exaustão (muro vivo acabou):**
- Pagamento de noten: 3.000 dividido (1 tenpai: +3.000 / −1.000 ×3; 2: ±1.500; 3: +1.000 / −3.000). Sanma: 3.000 (provisório; constante `notenTotal` configurável por modalidade).
- Nagashi mangan avaliado antes.
- Dealer **tenpai** ⇒ renchan; dealer noten ⇒ dealer passa. Honba +1 em ambos os casos.
- Revelar mãos tenpai (e só elas) no resumo.

**Empates abortivos** (honba +1, dealer repete, bastões de riichi ficam na mesa):
- **Kyuushu kyuuhai:** na primeira compra ininterrupta, mão com ≥ 9 tipos diferentes de terminais/honras; o jogador **escolhe** declarar. (Sanma: um kita anterior conta como chamada e impede.)
- **Suufon renda:** quatro descartes iguais de vento no primeiro giro, sem chamadas. (só yonma)
- **Suukaikan:** ver 7.6.
- **Suucha riichi:** os 4 jogadores em riichi. (só yonma)

### 7.12 Fluxo da partida

- **Uma mão (ikkyoku):** apenas E1; a partida termina ao fim dessa mão (encerra mesmo se a mão terminar em empate, exaustivo ou abortivo; decisão do desenvolvedor).
- **Leste (East-only):** E1–E4 (yonma) / E1–E3 (sanma). **Leste-Sul:** E1–E4 e S1–S4 (yonma) / E1–E3 e S1–S3 (sanma).
- Troca de dealer ⇒ assento do dealer avança; ao completar o ciclo, o vento da rodada avança.
- **Encerra** quando: terminou a última rodada prevista e alguém ≥ alvo; ou `tobi` ligado e alguém ficou < 0 (encerra logo após a resolução da mão); ou agari-yame na última mão, se `agariYame` estiver ligado (encerra automaticamente; tenpai-yame não existe na v1); ou ao fim de Oeste 4.
- **Extensão:** se ao fim da última rodada prevista ninguém atingiu o alvo, continuar para o próximo vento (Leste→Sul, Leste-Sul→Oeste). A cada mão seguinte, verificar se alguém atingiu o alvo.
- Resultado final: colocação por pontos (desempate 6.2), bastões restantes ao 1º. A tela de resultado mostra **apenas o ranking** (quem tem mais pontos vence) ✅ como no MS; **sem** bônus de colocação (uma) nem pontuação ajustada. Gerar o **resumo** (seção 12.4).

### 7.13 Sanma — diferenças que o motor deve implementar

Sanma **não** é yonma sem um jogador. Itens marcados ✅ vêm das telas oficiais de regras do Mahjong Soul (modo 3 jogadores) enviadas pelo desenvolvedor.

**Peças, muro e assentos**
- 108 peças (sem `2m–8m`) ✅. Dealer rotaciona entre 3 assentos; ventos de assento Leste/Sul/Oeste; **ninguém é o Norte**.
- **Sem chi** ✅. Pon e kan existem normalmente.
- Muro morto de 14 com **8 reposições** e indicador na 5ª peça (7.2) ✅.
- Indicador de dora em manzu: `1m ⇄ 9m` (cada um é o indicador do outro) ✅. Indicador Oeste ⇒ dora Norte; indicador Norte ⇒ dora Leste.

**Kita (nuki-dora)**
- Na sua vez, depois de comprar, o jogador pode retirar um **Norte** (da mão, inclusive o recém-comprado), expô-lo à parte e comprar **reposição do muro morto** ✅.
- Cada kita vale **+1 dora** (não é yaku). Se Norte também é dora (indicador Oeste), cada kita vale **2**; vale também para kan-dora e ura-dora (convenção adotada).
- **Tsumo na reposição de kita** conta como compra do muro morto ⇒ **rinshan kaihou** ✅. Não é haitei.
- **Kita conta como chamada** ✅: quebra ippatsu, chiihou, kyuushu kyuuhai (nove terminais na compra inicial) e daburu riichi. Mas **não abre a mão**: menzen, riichi e tsumo fechado continuam válidos.
- **Outros jogadores podem dar ron sobre a declaração de kita** quando o Norte completa a mão deles, **sem** yaku de chankan (precisam de outro yaku) ✅. O motor abre uma janela `awaitingRobbery` também para kita. Passar esse ron causa **furiten temporário** (decisão do desenvolvedor; não verificado no MS; dura até o próximo descarte do próprio jogador, ver 7.8); declarar kita não torna o declarante furiten (convenção adotada).
- Kita em riichi: permitido apenas se não alterar as esperas (convenção adotada).
- Trincas de Norte são **vento inútil** ✅: sem yaku e sem fu de par/trinca de honra de vento especial (Norte nunca é vento do assento nem da rodada).

**Pontuação e fim de partida**
- Pagamento de tsumo: **tsumo-loss** por padrão; `tsumoLoss` desligável ⇒ **north-bisection** (7.10) ✅.
- Pontos iniciais padrão 35.000 ✅; alvo padrão 40.000 ✅; peças vermelhas: 0 ou 2, padrão 2 ✅; tsumo-loss ligado por padrão ✅.
- Honba e noten no sanma: **provisório** 300 / 3.000 (como no yonma). As fontes divergem (200/2.000 aparece em uma delas); por isso `honbaRon` e `notenTotal` são **constantes configuráveis por modalidade**, trocáveis sem mexer na lógica do jogo.
- Empates abortivos: apenas `kyuushu kyuuhai` e `suukaikan` (sem suucha riichi nem suufon renda, pois há 3 jogadores).
- Yaku que dependem de sequências de manzu 2–8 simplesmente não ocorrem (ex.: sanshoku doujun); não é preciso tratamento especial além do conjunto reduzido de peças.

**Testes dedicados:** pagamentos tsumo-loss e north-bisection, kita (dora duplo com indicador Oeste, rinshan após kita, quebra de ippatsu/chiihou/kyuushu/daburu, mão continua fechada, ron sobre kita sem chankan), muro morto com 8 reposições, dora de manzu `1m⇄9m`, ausência de chi.

---

## 8. Bots

### 8.1 Contrato

```ts
interface BotPolicy {
  decide(view: PlayerView, legal: LegalActions, rng: Rng): Action;
}
```

- Recebem **apenas `PlayerView`**. Não existe caminho de código para ver mãos ocultas ou o muro.
- Seguem as mesmas regras do jogador humano (mesmo `getLegalActions`).
- Sem manipulação da distribuição. O RNG só serve para desempates e ruído de decisão.

### 8.2 Dois eixos independentes

**Força (dificuldade) = precisão do cálculo.**

| Nível | Comportamento |
|---|---|
| **Fácil** | Reduz o shanten de forma gulosa, com bastante ruído. Ignora leitura de defesa e eficiência fina. Chama com pouco critério (pode chamar sem yaku garantido). Declara riichi quando tenpai, quase sempre |
| **Normal** | Shanten + eficiência (ukeire com peças visíveis descontadas), reconhece yaku antes de abrir a mão, valor básico de mão, defesa simples (descartar peças seguras/genbutsu quando há riichi adversário e a própria mão está longe) |
| **Difícil** | Eficiência + valor esperado da mão + defesa mais completa (genbutsu, suji, kabe, risco por peça), contexto de placar (última mão, diferença para o 1º/2º), decisão de avançar ou recuar. Pouco ruído |

**Estilo (personagem) = escolhas entre opções razoáveis**, como um vetor de parâmetros sobre a **mesma** IA:

```ts
type BotStyle = {
  callTendency: number;      // 0..1  vontade de chamar chi/pon
  riichiTendency: number;    // 0..1  prefere riichi a manter dama
  defenseWeight: number;     // 0..1  quanto recua diante de riichi
  speedWeight: number;       // 0..1  prioriza mão rápida vs mão valiosa
  handValueWeight: number;   // 0..1  persegue mãos caras (honitsu, yakuhai, dora)
  risk: number;              // 0..1  tolerância a descartar peças perigosas
};
```

Um personagem agressivo no Fácil chama tudo e se perde; no Difícil chama tudo **com critério**. A dificuldade nunca muda regras nem sorte.

### 8.3 Personagens

- **A v1 começa com 3 personagens** (decisão do desenvolvedor), sem IA muito complexa. Cada um tem: `id`, nome, retrato (WebP), frase curta, descrição do estilo **em português** e um `BotStyle`. Mais personagens entram depois (só arte + números).

| Personagem | Estilo | Descrição para o jogador | `BotStyle` inicial (ajustável nos testes) |
|---|---|---|---|
| **Ren** | Defensivo | "Prioriza segurança, evita descartes perigosos e recua quando alguém declara riichi" | call 0,3 · riichi 0,4 · defesa 0,9 · velocidade 0,4 · valor 0,5 · risco 0,15 |
| **Akari** | Agressiva | "Busca mãos rápidas, chama chi/pon/kan quando vale e pressiona os adversários" | call 0,85 · riichi 0,8 · defesa 0,25 · velocidade 0,85 · valor 0,35 · risco 0,8 |
| **Sora** | Equilibrado | "Equilibra eficiência, valor da mão e defesa; é o oponente padrão" | todos 0,5 |

- Nomes provisórios; os retratos do conceito são atribuídos pelo desenvolvedor.
- Com 3 personagens, uma partida de 4 jogadores contra 3 bots usa os três (um por assento) por padrão; no sanma, 2 dos 3 (sorteio ou escolha). Repetir personagem só por escolha explícita.
- Na configuração da partida: dificuldade (global ou por assento) + personagem por assento ou "Aleatório".
- Em sala, assento de bot segue o mesmo esquema; o assento de jogador convidado desconectado é coberto por um bot de nível **Normal com o estilo da Sora** até ele voltar.

### 8.4 Execução

- Fácil/Normal: podem rodar na thread principal se ficarem abaixo de ~50 ms por decisão.
- Difícil: **Web Worker** (`bots/worker.ts`), com a `PlayerView` serializada e a ação devolvida por mensagem.
- O atraso "humano" de resposta (5.2) é aplicado na `session`.
- Ordem de implementação: Fácil e Normal na Fase 2 (com `BotStyle` já parametrizado), Difícil e personagens completos na Fase 6.

---

## 9. Ajudas opcionais (o "guia")

Todas as ajudas: **opcionais, individualmente liga/desliga, persistidas**, editáveis nas configurações e ao preparar a partida. **Só usam `PlayerView`.** Nenhuma joga pelo usuário.

### 9.1 Tela de boas-vindas (primeiro uso)

Antes da primeira partida, uma tela explica cada ajuda com exemplo visual e permite ativar/desativar. Não bloqueia o início; há "Decidir depois" (usa padrões). Salvar preferências para as próximas partidas.

### 9.2 Ajuda de regras

Explica a estrutura da mão (4 grupos + 1 par, chiitoitsu, kokushi) e mostra, para a mão atual: o que falta para completar (shanten em linguagem simples), e distingue **mão estruturalmente completa**, **tenpai** e **mão com yaku válido**.

### 9.3 Esperas, peças restantes ("Left") e No Yaku

- Quando em tenpai (ou ao analisar um descarte candidato), listar as peças que completam a mão e **quantas cópias ainda não estão visíveis**.
- "Restantes" = `4 − visíveis`, onde visíveis = própria mão + descartes de todos + chamadas expostas + indicadores de dora revelados (+ kita expostos no sanma). Texto da interface deve dizer **"não visíveis"**, nunca "no muro" (podem estar nas mãos dos adversários).
- **No Yaku:** para cada espera, informar se a vitória teria yaku **na situação real**, separando ron e tsumo (ex.: "Sem yaku no ron; com tsumo você teria Tsumo fechado"). **Não** tratar toda mão sem riichi como No Yaku: calcular de verdade.
- Mensagens distinguem: *mão completa*, *tenpai*, *yaku válido*, *No Yaku*, *possibilidade real de vitória* (restantes > 0 e sem furiten).
- Avisar **Furiten** quando aplicável.

### 9.4 Identificação das pedras (rótulos)

- Rótulos opcionais nas pedras da mão, descartes e grupos expostos.
- Configuração:

```ts
type TileLabels = {
  numbers: boolean;                              // número sobre manzu/pinzu/souzu (padrão: ligado)
  winds: 'off' | 'abbr' | 'name' | 'both';       // Leste/Sul/Oeste/Norte, ou L/S/O/N (padrão: 'name')
  dragons: 'off' | 'abbr' | 'name';              // Branco/Verde/Vermelho (padrão: 'off')
};
```

- Para manzu, o número deve ficar visível mesmo com a face em caracteres japoneses (ajuda principal para iniciantes).
- Rótulos são uma camada **independente do tema** e sempre legível (contraste garantido sobre qualquer face).
- Dragões: legenda existe mas vem **desligada por padrão** (reconhecíveis por cor/forma).

### 9.5 Avisos de jogadas disponíveis e botões

- Quando há ação legal, mostrar **botões visíveis e distintos**: Chi, Pon, Kan, Riichi, Ron, Tsumo, **Passar**.
- Cores consistentes **sempre acompanhadas de texto e ícone** (nunca só cor). Sugestão: Chi azul, Pon laranja, Kan rosa, Riichi vermelho, Ron/Tsumo dourado, Passar cinza.
- **Nunca executar chamada automaticamente.** Mostrar a opção e permitir passar. Opção extra "Sem chamadas" (modo iniciante) suprime os avisos de chi/pon/kan.
- Quando uma ação tem **variantes legais** (qual combinação de chi; usar 5 vermelho ou normal; qual descarte após chamar; qual descarte declara riichi), abrir **janela de escolha** antes de confirmar.
- **Riichi:** padrão = sugerir com botão de confirmação; opção "declarar automático" só vale quando há **um único descarte** que mantém o tenpai e a espera é inequívoca; caso contrário sempre pergunta.
- Ajuda "Indicador → Dora": mostrar "Indicador: Leste → Dora: Sul" no painel de dora (excelente para iniciantes; é uma confusão clássica).

### 9.6 Descartado (decisão do desenvolvedor)

- **Sugestão de descarte** (por eficiência/ukeire), ao vivo ou em revisão: **não será implementada**. O guia explica a situação; a decisão é sempre do jogador.

### 9.7 Modo treino: "Mostrar mãos"

- Opção avançada (padrão **desligada**), equivalente ao "Show Hands" do Mahjong Soul: mostra as mãos dos bots abertas na mesa, para o jogador aprender a **ler o jogo dos outros**.
- **Somente em partidas solo contra bots.** Em sala privada **nunca**, nem por escolha do anfitrião (seria trapaça contra humanos).
- Implementação: função separada `getTrainingView` (5.3), usada só pela `LocalSession` e só pela camada de apresentação. Bots e ajudas continuam recebendo `PlayerView` normal: **os bots não ganham nada** com isso, e a distribuição não muda.
- A mesa mostra um selo visível "Modo treino". A partida é marcada `training: true` no resumo (12.4) e **não entra nas estatísticas**.
- Teste/lint: nenhum módulo de `help/` ou `bots/` pode importar `getTrainingView`.

---

## 10. Interface e experiência

### 10.1 Rotas e telas

| Rota | Tela |
|---|---|
| `/` | Menu principal: Jogar partida · Tutorial e regras · Ajudas e acessibilidade · Configurações · Aparência · Salas privadas (marcado "Em breve" até a Fase 5) · Perfil/Histórico (se logado) |
| `/jogar` | Configurar partida (estrutura em 6.6): modalidade → duração → tempo → adversários → ajudas → chave "Configurações avançadas" → resumo → **Iniciar** |
| `/partida` | A mesa (sempre em paisagem) |
| `/tutorial/:capitulo` | Tutorial |
| `/ajudas` | Configuração das ajudas + rótulos |
| `/configuracoes` | Som, idioma (pt-BR), acessibilidade, tela cheia, dados salvos |
| `/aparencia` | Tema, feltro, faces, versos (Fase 6; antes disso, tema único) |
| `/perfil`, `/historico` | Conta Google (Fase 5) |
| `/salas`, `/sala/:codigo` | Criar/entrar em sala privada (Fase 5) |

### 10.2 A mesa

- **Resolução base fixa 1600×900 (16:9)**, escalada com `transform: scale()` para caber na viewport. Elementos têm posição fixa dentro do palco.
- Telas mais largas (celulares 20:9, ultrawide): o **fundo ilustrado preenche as sobras**; placar, botões e menu ficam **ancorados nas bordas** do viewport (respeitando `env(safe-area-inset-*)`).
- Perspectiva **suave** (inclinação pequena, quase vista de cima): aplicar `perspective` apenas ao plano da mesa; a mão do jogador **sem** perspectiva (legibilidade). Profundidade vem de sombra e espessura das pedras.
- Elementos: mão do jogador (embaixo), mãos dos outros (versos), **rios de descarte** (6 por fileira, 3 fileiras; peça de riichi e peça chamada giradas 90°), grupos expostos (melds, peça chamada deitada indicando de quem veio), muro/indicadores, **painel central** (rodada, honba, bastões, pontos e vento de cada assento, peças restantes), **painel de dora** (indicadores + "Indicador → Dora"), retratos com nome e pontos, relógio, botões de ação, menu (configurações, ajuda, tela cheia), atalhos "Sem chamadas" e "Organizar mão".
- Vento do assento sempre coerente: sentido anti-horário Leste → Sul → Oeste → Norte. Corrigir os erros do conceito (17.3).
- Cabeçalho: "Leste 1" em destaque (+ 東一局 pequeno como decoração, para o jogador absorver os termos).

### 10.3 Interação

- **PC:** clique para selecionar/descartar; arrastar opcional; atalhos de teclado (setas/Enter, teclas para Chi/Pon/Kan/Riichi/Ron/Tsumo/Passar — documentar na tela de ajuda).
- **Celular (toque):** 1º toque seleciona (peça sobe e mostra ajudas daquela escolha), 2º toque descarta. Toque longo no lugar de hover para dicas. Alvos grandes, botões de ação perto do polegar. Alvo mínimo ~44 px.
- Organização automática da mão (opcional) e manual.

### 10.4 Tempo por jogada

- **Padrão: 5+20.** Funcionamento (decisão do desenvolvedor):
  - A cada jogada o jogador tem **5 s de tempo base**, que **voltam ao valor cheio a cada nova jogada**.
  - Passou dos 5 s? O excedente é **descontado do banco de 20 s**. Ex.: demorou 6 s ⇒ gasta 1 s do banco (**5-19**); demorou 3 s ⇒ banco intacto; demorou 10 s ⇒ gasta 5 s (**5-14**).
  - O banco **só diminui** durante a mão e **volta ao valor cheio no início da mão seguinte** ("rodada" = cada mão, E1, E2…; confirmado). Com o banco zerado, só vale o tempo base.
  - Exibição `base-banco`, ex.: `5-19`. Nos atalhos sem banco (60+0, 300+0), só o tempo base.
  - Algoritmo: a cada segundo, se `base > 0` desconta da base; senão, se `banco > 0` desconta do banco; senão, **estouro**.
- **Personalizável:** o jogador escolhe livremente o tempo por jogada e o banco, ou **ilimitado**:

```ts
type TimerSettings =
  | { mode: 'timed'; baseSeconds: number; bankSeconds: number }  // padrão: { 5, 20 }
  | { mode: 'unlimited' };
```

  - Faixas sugeridas: `baseSeconds` de 1 a 60; `bankSeconds` de 0 a 300 (0 = sem banco). Validar na tela de configuração.
  - Atalhos prontos na interface (iguais aos do Mahjong Soul): `3+5`, `5+10`, **`5+20` (padrão)**, `60+0`, `300+0`; mais **Ilimitado** e **Personalizado** (o jogador digita os valores que quiser). `60+0` e `300+0` = 60 s / 300 s por jogada, sem banco. "Restaurar padrão" volta ao 5+20.
  - Dica discreta para iniciantes: "O 5+20 é rápido; para aprender, experimente um tempo maior ou ilimitado."
  - A última escolha de tempo é salva nas preferências, mas **sempre começa pré-selecionando 5+20** para quem nunca mudou.
- A interface explica claramente como funcionam o tempo inicial e o banco, e mostra os dois contadores na mesa.
- Vale para solo e para salas (na sala, quem define é o anfitrião).
- Estouro total: descarta a peça comprada (tsumogiri) / passa a chamada. Em riichi, tsumogiri.
- Em sala, o relógio é do anfitrião (13.5).
- Constante `bankRefill = 'hand'` (banco reabastece a cada mão), mantida como constante para fácil ajuste.

### 10.5 Janelas de decisão

Componente único `DecisionDialog` para: escolha de combinação de chi/pon (com e sem peça vermelha), escolha do descarte que declara riichi, confirmação de riichi, kan com múltiplas possibilidades, kyuushu kyuuhai. Mostra as peças envolvidas, texto claro e botão cancelar.

### 10.6 Orientação e celular

- **A partida é sempre em paisagem.** Menus, tutorial, perfil e histórico funcionam em qualquer orientação.
- Ao tocar em **Iniciar partida** (gesto do usuário):
  1. Tentar `requestFullscreen()` + `screen.orientation.lock('landscape')` (funciona no Android/Chrome).
  2. Se não for possível (iPhone/Safari) e o aparelho estiver em pé: **girar o palco 90° via CSS** (`width: 100vh; height: 100vw; transform: rotate(90deg)` com origem/translação corretas). O jogador só vira o aparelho na mão; funciona mesmo com bloqueio de rotação ativo.
  3. Se já está deitado: não fazer nada.
- Ao sair da partida: destravar orientação e sair da tela cheia.
- Cuidados na rotação por CSS: ajustar coordenadas de **arrastar** (cliques funcionam normalmente); testar áreas seguras.
- `navigator.wakeLock` durante a partida (tela não apaga), quando suportado.
- PWA: `manifest` com `"orientation": "landscape"` para a versão instalada; aviso discreto no iPhone ensinando a "Adicionar à Tela de Início".
- Efeitos decorativos (pétalas, brilhos) mais leves ou desligados por padrão no celular e com `prefers-reduced-motion`.

### 10.7 Acessibilidade

- Nenhuma informação só por cor. Contraste mínimo AA nos botões e rótulos sobre o fundo escuro.
- Rótulos de leitor de tela para as pedras em português (ex.: "5 de souzu, vermelho").
- Opção de tamanho de peças/fonte, "reduzir movimento", alto contraste.
- Teclado completo na mesa (PC).

### 10.8 Tutorial

Textual, em capítulos curtos, disponível a qualquer momento (não bloqueia partida), com exemplos usando o componente `<Tile>`:

1. Tipos de pedras (naipes, números, ventos, dragões, cópias).
2. Como formar uma mão (sequências, trincas, quadras, pares, mãos especiais).
3. Como vencer (tenpai, yaku, riichi, ron, tsumo).
4. Ações (chi, pon, kan, descartes, consequências das chamadas).
5. Pontuação (han, fu, dora, pagamentos, empate, condições especiais).
6. Yonma × sanma e regras configuráveis.

Conteúdo em `src/content/tutorial/*.md`. Explicar termos sem presumir conhecimento prévio. O texto deve ser revisado pelo desenvolvedor.

---

## 11. Identidade visual e áudio

### 11.1 Direção de arte

- Tema padrão **"Noite de Sakura"**: roxo noturno, sakura, lanternas, madeira escura, bordas douradas finas. Referência: `docs/concept/Mesa_de_Mahjong_Sob_a_Lua.png`.
- **A imagem é referência visual, não spec de regras nem tela de jogo.** Implementação em camadas:
  - **Fundo** (varanda, céu, lua, plantas): ilustração estática em WebP (~200–400 KB). Animação CSS leve opcional (brilho de lanternas, pétalas) com opção de desligar.
  - **Feltro** com padrão de sakura: textura (WebP/SVG) repetível ou única.
  - **Moldura de madeira**: CSS/SVG.
  - **Pedras, painel central, placar, botões, menus**: HTML/CSS/SVG (nítidos em qualquer escala).
  - **Retratos**: WebP pequenos.
- Perspectiva e proporções **menos extremas** que o conceito, para que descartes laterais continuem legíveis.
- Arte própria do desenvolvedor. Enquanto não houver arte final, usar **placeholders** gerados por script (ver 11.3).

### 11.2 Pedras em camadas (essencial para temas futuros)

1. **Corpo** da pedra (formato, borda, sombra) — compartilhado por todos os temas.
2. **Face** (desenho do 5 de bambu, do dragão etc.) — o que cada tema troca.
3. **Verso** — troca por tema.
4. **Camada de ajudas** (rótulo, destaque de dora/espera, borda de peça selecionada) — **independente do tema**, sempre legível.

Faces em **SVG ou CSS** (ver 11.3), nomeadas pela notação: `1m…9m`, `1p…9p`, `1s…9s`, `1z…7z`, e `0m`, `0p`, `0s` (cincos vermelhos) — **37 arquivos**. Um tema é uma pasta com esses arquivos + `theme.json`:

```json
{
  "id": "noite-de-sakura",
  "name": "Noite de Sakura",
  "tokens": { "felt": "#2a2145", "frame": "#3b2a22", "tileBack": "#4b3a8c", "accent": "#d9b36a" },
  "background": "bg.webp",
  "facesType": "svg",
  "faces": "faces/",
  "back": "back.svg"
}
```

Na v1 existe **um tema**, mas o carregamento já é por `theme.json`. Personalização (Fase 6): tela "Aparência" com escolha **independente** de fundo, feltro, faces e verso, com **prévia ao vivo**. Tudo desbloqueado. A escolha é local de cada jogador (em sala, **não** sincroniza entre jogadores).

### 11.3 Placeholders e licenças

- **Ordem de preferência (decisão do desenvolvedor):** (1) um conjunto de faces pronto com **licença de uso clara** (conferir a licença antes; registrar em `CREDITS.md`); (2) se nenhum servir, **faces próprias em CSS (preferência)**: círculos dos pinzu e barras dos souzu em CSS, mais glifos de uma fonte japonesa para manzu e honras (subconjunto mínimo de ~20 caracteres: 一二三四五六七八九萬 東南西北白發中); (3) se CSS for inviável, SVG.
- O sistema de temas aceita os dois formatos (`facesType: 'svg' | 'css'`): arquivos SVG **ou** componente/CSS por peça. A camada de ajudas continua independente.
- Qualquer opção é substituída depois pela arte final do desenvolvedor sem mudar código.

### 11.4 Tipografia

- **Títulos/logo/menus:** fonte japonesa marcante **com latim completo e acentos do português** (testar "Ação, Configurações, Não há Yaku, Início, Vitória"). Candidatas (Google Fonts, licença OFL): *Shippori Mincho*, *Kaisei Decol*, *Yuji Syuku*, *Dela Gothic One*, *Reggae One*.
- **Texto corrido, tutorial, ajudas, botões:** fonte limpa e legível: *M PLUS 1p* ou *Zen Kaku Gothic New*.
- A fonte dos títulos deve cobrir **acentos do português** e os **caracteres japoneses** usados (decoração e faces). Auto-hospedar as fontes (ex.: `@fontsource/*`) com subset latino (+ subset mínimo dos kanji necessários), para funcionar offline no PWA e evitar requisições externas.
- Evitar fontes "ocidentais imitando japonês" (caricatas e sem acentos).
- Caracteres japoneses decorativos (東一局 etc.) em fonte com subset mínimo ou como SVG.

### 11.5 Som

- **Sem música.** Somente efeitos, via Howler.js, pré-carregados ao iniciar a partida (o clique em "Iniciar partida" também libera o áudio no iOS).
- Lista base: **descarte** (o "clac" de pedra na mesa — o mais importante), compra, chi, pon, kan, **riichi** (mais marcante), ron, tsumo, fim de mão/empate, início de rodada, aviso de tempo acabando (5+20), clique de UI.
- Mapeamento `GameEvent → som` em `audio/`. Controles: volume, mudo; opcional volume por categoria.
- Fontes: gravações próprias (pedras reais, se possível), ou freesound.org com licença **CC0** (ou CC-BY com atribuição em `CREDITS.md`). Formatos: `.webm` + `.mp3` de fallback.
- Vozes ("Riichi!", "Pon!") ficam fora da v1.

---

## 12. Conta, perfil e persistência

### 12.1 Convidado (sem login)

> **Terminologia:** "convidado" nas seções de conta/perfil (12.x) = quem usa o site **sem login** ("visitante"). Na seção 13 (salas), "jogador convidado" = amigo que entra numa sala (**sempre com login Google**); "anfitrião" = quem criou a sala.

- **Não usa Firebase Auth nem banco.** Só joga **solo contra bots**. Sem salas, sem histórico.
- Preferências (ajudas, rótulos, som, regras preferidas por modalidade, aparência) em `localStorage` (`settings:v1`, com `schemaVersion`). Partida em andamento em IndexedDB (5.6).

### 12.2 Conta Google

- Firebase Auth com provedor Google. **Login anônimo do Firebase não é usado.**
- Libera: perfil, histórico, salas privadas, sincronização de preferências entre aparelhos.
- Perfil em `users/{uid}/profile`: `displayName` (≤ 24 caracteres, sanitizado), `avatar` (id de avatar temático **ou** `"google"` para usar a foto da conta via `photoURL`).
- Preferências sincronizadas em `users/{uid}/settings` (mesmo formato do `localStorage`).

### 12.3 Migração do convidado para a conta

No primeiro login, se existirem preferências locais, perguntar: **"Levar suas configurações atuais para a conta?"** (Sim = grava em `users/{uid}/settings`; Não = usa as da conta/padrão). Nunca sobrescrever configurações da conta sem perguntar.

### 12.4 Histórico (somente resumo)

Cada jogador logado grava o **próprio** resumo ao fim de cada partida (solo ou sala). Em sala, o anfitrião publica o resultado final e cada cliente grava na própria pasta — as regras de segurança ficam simples (cada usuário só escreve em `users/{uid}`).

```ts
type MatchSummary = {
  id: string;
  endedAt: number;                       // epoch ms
  source: 'solo' | 'room';
  mode: 'yonma' | 'sanma';
  length: 'oneHand' | 'east' | 'south';
  rules: { startingPoints: number; targetPoints: number; tobi: boolean; akaDora: number; kuitan: boolean; hanMinimum: 1 | 2 | 4; kiriageMangan: boolean };
  training: boolean;                     // modo treino (Mostrar mãos): fora das estatísticas
  placement: 1 | 2 | 3 | 4;
  finalPoints: number;
  players: { seat: number; name: string; points: number; isBot: boolean; characterId?: string }[];
  wins: { round: string; type: 'ron' | 'tsumo'; yaku: string[]; han: number; fu: number; points: number }[]; // mãos vencidas pelo jogador
  endReason: 'normal' | 'tobi' | 'agariYame' | 'abandoned';
};
```

- Guardar as últimas **100** partidas (o cliente apaga as mais antigas ao gravar).
- Tela de histórico: lista com filtros por modo/duração e estatísticas simples (colocação média, % de 1º lugar, maior mão, yaku mais frequentes).

### 12.5 Avatares

- Conjunto de avatares temáticos (pedras, dragões, ventos, personagens) desenhados pelo desenvolvedor. Sem upload de imagem (Cloud Storage exige Blaze desde 03/02/2026; ver ADR).
- Opção "Usar foto da minha conta Google".
- Extensão futura (só se necessário): miniatura 128×128 comprimida em base64 no banco. Não implementar na v1.

### 12.6 Privacidade e dados

- Coletar o mínimo: uid, nome de exibição, avatar, preferências, resumos de partida. Sem analytics de terceiros.
- Tela de perfil com **"Apagar meus dados"** (remove `users/{uid}`) e **"Sair"**.

### 12.7 Cotas

- Plano **Spark**. Monitorar uso do Realtime Database e do Hosting. Valores de cota mudam: **conferir os limites atuais no console do Firebase** antes de lançar e registrar em ADR.
- Realtime Database: **`us-central1` (Iowa)**. A documentação oficial do Firebase lista apenas `us-central1`, `europe-west1` e `asia-southeast1` para o Realtime Database; **São Paulo (`southamerica-east1`) não é uma opção para esse serviço**. A região não pode ser alterada depois de criada. Para jogadores no Brasil, `us-central1` é a mais próxima das três.

---

## 13. Salas privadas (Fase 5)

### 13.1 Modelo: o anfitrião é o servidor

> Nesta seção, "convidado" = **jogador convidado da sala** (logado). O visitante sem login nunca entra em salas.

- O navegador do anfitrião roda o motor (`HostSession`), embaralha, valida cada ação, controla o relógio e roda os bots.
- O Firebase é só **canal de mensagens** e presença. Convidados **não** rodam motor.
- Cada convidado recebe **somente a sua `PlayerView`**; regras de segurança impedem ler a visão de outro.
- **Limitação aceita (documentar no README, é decisão de arquitetura consciente):** o anfitrião tecnicamente tem acesso a todo o estado; se ele fechar a aba, a partida pausa. Adequado a partidas entre amigos; **não** é à prova de trapaça de um anfitrião malicioso. A alternativa (servidor autoritativo com Cloud Functions) exige plano Blaze e foi descartada.
- Salas são **só por código/link**. Não existe lista pública, fila ou matchmaking.

### 13.2 Fluxo

1. Anfitrião (logado) abre **Criar sala** e usa **a mesma tela de configuração do solo** (modalidade, regras, duração, tempo, bots). Recebe um **código de 6 caracteres** (alfabeto sem ambiguidade, ex.: sem `0/O/1/I`) e um **link** `/sala/ABC123`.
2. Amigos (logados) abrem o link ou digitam o código, veem a configuração e escolhem um assento livre.
3. O anfitrião pode atribuir personagens aos assentos de bot; assentos vazios no início viram bots.
4. Anfitrião inicia. Todos veem a mesa (em paisagem).
5. Ao fim, o anfitrião publica o resultado; cada cliente grava o próprio resumo (12.4). A sala pode ser reiniciada ("jogar de novo") ou encerrada.

### 13.3 Estrutura no Realtime Database

```
rooms/{code}/
  meta/        { hostUid, status: 'lobby'|'playing'|'ended', createdAt, expiresAt,
                 mode, rules, settings, protocolVersion }          # sem nada sensível
  seats/{0..3} { type: 'human'|'bot'|'empty', uid?, displayName, avatar, characterId?, connected }
  members/{uid}: true                                              # quem entrou (escrito pelo próprio ao entrar)
  presence/{uid}: true                                             # onDisconnect remove
  public/      { seq, phase, deadlineAt, ...resumo mínimo (placar) }
  private/{uid}/ { seq, view: PlayerView, events: GameEvent[] }    # só o host escreve; só o uid lê
  inbox/{uid}/{pushId} { clientSeq, action, ts }                   # só o uid escreve; só o host lê
users/{uid}/ { profile, settings, history/{matchId} }
```

- Cada atualização do anfitrião é **uma escrita multi-caminho atômica** (`update` na raiz) com todas as `private/*/view`, `public` e `seq` monotônico.
- A `view` inclui tudo o que o jogador pode ver (inclusive a parte pública da mesa), então o cliente renderiza **só** a partir de `private/{uid}`.

### 13.4 Protocolo

- Convidado envia `{ clientSeq, action }` em `inbox/{uid}`. O anfitrião lê, passa pelo motor (`applyAction`), apaga o item processado e publica a nova visão.
- Ação ilegal ou fora de hora: o motor rejeita; o anfitrião escreve um erro leve em `private/{uid}` (`lastError`) e **não altera o estado**.
- Idempotência por `clientSeq` (reenvio após reconexão não duplica ações).
- `protocolVersion` na `meta`: cliente com versão incompatível recebe aviso para recarregar.

### 13.5 Relógio (padrão 5+20, ou o tempo personalizado pelo anfitrião)

- Controlado pelo anfitrião. `public.deadlineAt` em tempo do servidor; clientes calculam o contador com `.info/serverTimeOffset`.
- Estouro ⇒ o anfitrião aplica a ação padrão (tsumogiri / passar).
- Tempo ilimitado: sem `deadlineAt`.
- Sugestão: **tolerância de rede** (constante `networkGraceMs`, ex.: 1000 ms) somada ao prazo de jogadores remotos, porque cada ação percorre convidado → banco → anfitrião → banco → convidado.

### 13.6 Desconexão e retomada

- **Convidado cai:** presença via `.info/connected` + `onDisconnect`. Um **bot (Normal, estilo equilibrado)** assume o assento até o amigo reconectar; ao voltar, retoma na primeira oportunidade segura (início de uma jogada).
- **Anfitrião cai:** o jogo **pausa** ("Anfitrião desconectado"). O estado completo está salvo localmente (5.6); ao reabrir e entrar na sala, ele retoma. **Migração de anfitrião está fora do escopo.**
- Convidados que ficam sozinhos por tempo longo (ex.: 10 min sem anfitrião) veem opção de sair.
- **Persistência em sala (decisão do desenvolvedor, com este desenho):**
  - O **estado completo** da partida existe **apenas no navegador do anfitrião** (IndexedDB, 5.6). Nunca é gravado no banco, porque contém informação oculta.
  - O jogador convidado **não tem estado de jogo próprio para salvar**: tem um identificador próprio (uid) e uma `PlayerView` em `private/{uid}`. Ao reconectar, ele **relê a visão atual** e volta ao jogo, se a partida ainda estiver em andamento. Se a sala foi encerrada ou apagada, não há o que recuperar.
  - Enquanto ele está fora, o **bot cobre o assento** (acima).
  - Seu **resumo de partida** é gravado só em `users/{uid}/history`, pelo próprio cliente.
  - **Validação de acesso:** as regras de segurança (13.7) impedem que um jogador convidado leia ou altere dados de outro jogador ou da sala.

### 13.7 Regras de segurança (esboço — testar com o emulador; RTDB não tem funções, repetir as expressões)

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read":  "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid && auth.token.firebase.sign_in_provider === 'google.com'",
        "profile": {
          "displayName": { ".validate": "newData.isString() && newData.val().length <= 24" },
          "avatar":      { ".validate": "newData.isString() && newData.val().length <= 64" }
        },
        "history": {
          "$matchId": { ".validate": "newData.hasChildren(['endedAt','mode','placement','finalPoints'])" }
        }
      }
    },
    "rooms": {
      "$code": {
        "meta": {
          ".read":  "auth != null && auth.token.firebase.sign_in_provider === 'google.com'",
          ".write": "auth != null && auth.token.firebase.sign_in_provider === 'google.com' && (!data.exists() ? newData.child('hostUid').val() === auth.uid : data.child('hostUid').val() === auth.uid)"
        },
        "seats": {
          ".read":  "auth != null && (root.child('rooms').child($code).child('members').child(auth.uid).exists() || root.child('rooms').child($code).child('meta/hostUid').val() === auth.uid)",
          ".write": "auth != null && root.child('rooms').child($code).child('meta/hostUid').val() === auth.uid"
        },
        "members": {
          "$uid": {
            ".read":  "auth != null && ($uid === auth.uid || root.child('rooms').child($code).child('meta/hostUid').val() === auth.uid)",
            ".write": "auth != null && auth.token.firebase.sign_in_provider === 'google.com' && (($uid === auth.uid && root.child('rooms').child($code).child('meta/status').val() === 'lobby') || root.child('rooms').child($code).child('meta/hostUid').val() === auth.uid)"
          }
        },
        "presence": {
          "$uid": {
            ".read":  "auth != null && root.child('rooms').child($code).child('members').child(auth.uid).exists()",
            ".write": "auth != null && $uid === auth.uid && root.child('rooms').child($code).child('members').child(auth.uid).exists()"
          }
        },
        "public": {
          ".read":  "auth != null && root.child('rooms').child($code).child('members').child(auth.uid).exists()",
          ".write": "auth != null && root.child('rooms').child($code).child('meta/hostUid').val() === auth.uid"
        },
        "private": {
          "$uid": {
            ".read":  "auth != null && auth.uid === $uid",
            ".write": "auth != null && root.child('rooms').child($code).child('meta/hostUid').val() === auth.uid"
          }
        },
        "inbox": {
          "$uid": {
            ".read":  "auth != null && root.child('rooms').child($code).child('meta/hostUid').val() === auth.uid",
            ".write": "auth != null && $uid === auth.uid && root.child('rooms').child($code).child('members').child(auth.uid).exists()"
          }
        }
      }
    }
  }
}
```

Pontos a validar nos testes de regras:
- Convidado **não** lê `private/{outroUid}`, nem escreve em `public`, `seats` ou `meta` de sala alheia.
- Ninguém lista `rooms/` (sem `.read` na raiz de `rooms`).
- Usuário não-membro não lê `public`/`seats`.
- Entrar na sala só enquanto `status === 'lobby'` (reconexão durante `playing` de quem já é membro continua válida porque `members/{uid}` já existe).
- Limites de tamanho/validação nos nós de entrada (`inbox`) para evitar abuso.
- `meta` não pode conter dado sensível (é legível por qualquer usuário logado que conheça o código).

### 13.8 Limpeza

- Sem funções agendadas no Spark. O anfitrião **apaga a própria sala** ao encerrar e remove salas antigas dele ao criar uma nova (usar `expiresAt`). Lixo residual é aceitável e pequeno.

---

## 14. Estratégia de testes

O **motor de regras bem testado** é o maior ativo de portfólio. Meta: cobertura de linhas do `engine/` ≥ 90% e **centenas** de casos.

### 14.1 Unitários (Vitest, ao lado do código)

- **Peças:** parser/serializador de notação, contagem, ordem de dora (inclusive sanma `1m↔9m`), vermelhas.
- **Muro:** 136/108 peças, tamanho do muro vivo/morto, reposição após kan, haitei/houtei.
- **Mão:** decomposição (todas as leituras), **shanten** (padrão, chiitoitsu, kokushi) contra casos conhecidos, esperas (inclusive chuuren de 9 esperas, kokushi de 13), agari.
- **Yaku:** para cada yaku, mãos que devem e que **não** devem pontuar; interação (ryanpeikou × chiitoitsu, pinfu × ryanmen, sanankou com ron, vento duplo...).
- **Fu/han/pagamentos:** a tabela de referência da 7.10 + limites (mangan/haneman/…/kazoe), honba, bastões, `kiriageMangan` on/off, tsumo-loss no sanma.
- **Furiten:** permanente, temporário, de riichi.
- **Chamadas:** prioridade ron > pon/kan > chi, chi só do jogador anterior, **kuikae**, kan após riichi, 4 kans, chankan.
- **Fluxo:** renchan, empates abortivos (os 4 tipos), nagashi mangan, noten bappu, extensão Leste→Sul/Oeste, tobi, agari-yame, fim em Oeste 4.
- **Regras (dados):** `validateRules` rejeita combinações inválidas por modalidade.
- **PlayerView:** teste que **nunca** vaza mão alheia, muro ou ura-dora (comparar a visão com o estado completo).

### 14.2 Propriedades e simulação (em `tests/`)

- Simular **milhares de partidas completas** bot × bot (sementes fixas) em yonma e sanma, verificando invariantes a cada ação:
  - **Conservação de peças** (nenhuma duplicada/perdida).
  - **Conservação de pontos:** `soma dos pontos + 1000 × bastões na mesa` = `startingPoints × nº de jogadores` (com os padrões: 100.000 yonma; 105.000 sanma). Testar também com pontos iniciais personalizados.
  - Nenhuma ação ilegal aceita; nenhuma ação legal rejeitada (`getLegalActions` coerente com `applyAction`).
  - Toda partida termina.
- Teste de mesma semente ⇒ mesma partida (determinismo).

### 14.3 Conferência externa (opcional, bom para portfólio)

- Comparar pontuação/yaku com bibliotecas públicas **apenas em teste** e/ou com mãos documentadas em fontes confiáveis. Se possível, validar contra logs de partidas reais públicos.

### 14.4 UI e rede

- Componentes críticos (Tile, ActionBar, DecisionDialog, painel de ajudas) com Testing Library.
- Teste de regras do banco com **`@firebase/rules-unit-testing` + emulador** (13.7).
- Teste manual/E2E de fluxo: iniciar solo, jogar uma mão, rotação em viewport de celular (DevTools) e em **aparelho real** (toque, tela cheia, rotação).

### 14.5 CI

GitHub Actions: `lint`, `typecheck`, `test` (unit + simulação curta). Deploy no Hosting apenas na `main` e com testes verdes. Simulação longa em job separado/manual.

---

## 15. Fases e critérios de aceitação

> Cada fase termina com tudo funcionando, testado e implantável. Não pular fases.

### Fase 0 — Fundação
- Projeto Vite + React + TS strict; lint com **regra de fronteira do `engine/`**; Prettier; Vitest; CI; Firebase Hosting (deploy de uma página); PWA básico; i18n pt-BR; `CREDITS.md`; `CLAUDE.md`; ADRs iniciais (estilo CSS escolhido, Spark/Blaze, host-as-server).
- **Aceite:** `npm run lint && npm run typecheck && npm test` verdes; deploy automático funcionando; importar React dentro de `engine/` falha no lint.

### Fase 1 — Motor yonma
- Peças, RNG, muro, mão (decomposição/shanten/esperas), **todos os yaku da 7.9**, fu/han/pagamentos, chamadas, kan, riichi, furiten, empates, fluxo de mão e de partida, `RuleSet` + `validateRules` + preset yonma, `getPlayerView`, serialização.
- Um **simulador de linha de comando** que joga partidas bot-aleatório-legal × bot-aleatório-legal.
- **Aceite:** tabela de referência 7.10 passa; simulação de ≥ 5.000 partidas sem violar invariantes; cobertura ≥ 90% no `engine/`; `PlayerView` sem vazamentos (testado).

### Fase 2 — Mesa jogável (yonma × bots)
- Tela de configuração de partida gerada pelos `RuleOption` (bloco básico + chave "Configurações avançadas", tempos pré-definidos/personalizado, validação, resumo — ver 6.6); mesa 2.5D no tema "Noite de Sakura" (placeholders aceitáveis); `LocalSession`; bots **Fácil e Normal** (com `BotStyle` já parametrizado); botões de ação com Passar; janelas de decisão (chi/pon/riichi); tempo 5+20 por padrão, personalizável ou ilimitado; sons; autosave/continuar; resultado de mão e de partida; layout responsivo com palco 1600×900; trava/rotação de orientação; suporte a toque.
- **Aceite:** é possível jogar uma partida yonma completa (Leste e Leste-Sul) no PC e no celular contra bots, com som; combinações de regras inválidas são impedidas e explicadas; recarregar a página permite continuar a partida; nenhum bot acessa informação oculta (revisão de tipos).

### Fase 3 — Ajudas, onboarding e tutorial
- Tela de boas-vindas; ajuda de regras; esperas + restantes + No Yaku + Furiten; rótulos configuráveis; painel Indicador→Dora; "Sem chamadas"; tutorial em 6 capítulos; **modo treino "Mostrar mãos"** (solo); acessibilidade (contraste, leitor de tela, teclado, reduzir movimento).
- **Aceite:** todas as ajudas liga/desliga e persistidas; contagem de "restantes" bate com testes (só peças visíveis); mensagens distinguem completa/tenpai/yaku/No Yaku/vitória real; nenhum dado oculto usado (ajudas só aceitam `PlayerView`).

### Fase 4 — Sanma
- Preset sanma, 108 peças, sem chi, kita/nuki-dora (com ron sobre kita e rinshan após kita), tsumo-loss ligável/desligável, muro morto com 8 reposições, abortivos, dora de manzu, tela de configuração com regras do sanma.
- **Aceite:** testes dedicados (7.13) passam; simulação de ≥ 5.000 partidas sanma sem violar invariantes; jogável de ponta a ponta com ajudas.

### Fase 5 — Conta, histórico e salas privadas
- Login Google, perfil/avatares, migração de preferências, histórico (resumos), `HostSession`/`GuestSession`, criar/entrar por código ou link, lobby, bots em assentos vazios, presença, bot cobrindo amigo desconectado, pausa se o anfitrião cair, relógio do anfitrião, regras de segurança + testes no emulador.
- **Aceite:** 2–3 pessoas em aparelhos diferentes jogam uma partida completa em sala privada; convidado não consegue ler a visão de outro (teste de regras); resumo é gravado no histórico de cada um; tudo opera no plano Spark.

### Fase 6 — Bots avançados, personalização e acabamento
- Bot **Difícil** (Web Worker), personagens completos com estilos, tela **Aparência** (fundo/feltro/faces/verso independentes, prévia ao vivo, tudo desbloqueado), arte final, polimento de animações e sons, README de portfólio explicando as decisões (host-as-server, motor puro, tipos como barreira de informação).
- **Aceite:** Difícil vence Fácil/Normal de forma consistente em simulação (sem acesso a informação oculta); trocar tema não exige mudar código; Lighthouse/performance aceitável no celular.

---

## 16. Pendências, decisões e verificações

Quatro grupos. Nunca marcar algo como "regra oficial do Mahjong Soul" só porque existe uma recomendação plausível. Registrar cada item em `docs/adr/`.

### 16.A Confirmado (por print do Mahjong Soul ou fonte consultada)

- **Yonma:** 25.000 / 30.000; 3 peças vermelhas (opções 0/3/4); tobi ligado; tanyao aberto ligado; han mínimo 1; tempos 3+5, 5+10, 5+20, 60+0, 300+0.
- **Sanma:** 35.000 / 40.000; peças vermelhas 0 ou 2 (padrão 2); tobi ligado; tsumo-loss ligado por padrão e desligável; tanyao aberto ligado; han mínimo 1.
- **Sanma (telas de regras):** sem chi; sem 2m–8m; `1m⇄9m` como indicadores de dora; muro morto com 8 reposições; regras do kita (7.13); Norte inútil como vento; nuki-dora sem chave.
- **Resultado final:** apenas ranking por pontos.
- **Realtime Database:** só existem `us-central1`, `europe-west1` e `asia-southeast1` (documentação oficial do Firebase).

### 16.B Decisões do desenvolvedor (aprovadas)

1. **Tempo 5+20:** 5 s por jogada (voltam a cada jogada) + banco de 20 s que só diminui e volta ao valor cheio a cada mão; exibido `5-19` (10.4). Presets 3+5, 5+10, 5+20, 60+0, 300+0, Ilimitado, Personalizado.
2. **Agari-yame:** automático; **opção `agariYame` ligada por padrão**. **Tenpai-yame fora da v1.**
3. **Peças vermelhas do sanma:** 5p e 5s (uma de cada), +1 han cada; sem 5m vermelho.
4. **Sem sugestão de descarte**, nem ao vivo nem em revisão.
5. **"Uma mão":** termina ao fim da primeira mão, vitória ou empate (exaustivo ou abortivo).
6. **Han mínimo:** dora/aka/ura contam, mas é obrigatório ter ao menos 1 yaku.
7. **Pao:** só daisangen e daisuushii.
8. **Kita:** passar um ron sobre kita ⇒ furiten temporário (até o próximo descarte do próprio jogador).
9. **Personagens:** 3 na v1 (Ren defensivo, Akari agressiva, Sora equilibrado), estilo independente da dificuldade.
10. **Persistência:** visitante sem login salva localmente; em sala, o estado completo fica no navegador do anfitrião, o jogador convidado relê sua visão ao voltar e um bot cobre o assento enquanto ele está fora (13.6).
11. **Yaku locais** fora da v1. **Kiriage mangan** como opção nossa, desligada por padrão.
12. **Validação numérica:** rejeitar com mensagem valores fora de 100–200.000 ou do passo de 100; só aceitar após correção.
13. **Fontes:** com acentos do português e kanji necessários (Shippori Mincho/M PLUS 1p como candidatas). **Faces:** conjunto com licença clara → senão **CSS (preferência)** → senão SVG (11.3).
14. **Kan, dora e chankan:** regras do riichi padrão (7.5, 7.6, 7.9).
15. **Desempate:** prioridade de assento Leste > Sul > Oeste > Norte, igual na classificação e na exibição.
16. **Região do banco:** `us-central1`.
17. **Honba e noten no sanma:** provisório 300 / 3.000, como constantes configuráveis por modalidade.
18. **Banco de tempo:** confirmado: os 20 s voltam no início de cada nova mão.

### 16.C Convenções padrão adotadas (valem até o desenvolvedor vetar)

Riichi exige ≥ 4 peças no muro vivo · kazoe yakuman a partir de 13 han · daisuushii como yakuman duplo · karaten conta como tenpai no pagamento de noten · par de vento duplo vale 4 fu · kita conta também para kan-dora e ura-dora · kita em riichi só se não alterar as esperas · empates abortivos do sanma: só kyuushu kyuuhai e suukaikan · kan fechado em riichi só se não alterar as esperas · dora de ankan imediata e de kan aberto/kakan após o descarte · chankan sobre ankan só para kokushi musou.

### 16.D Em aberto

Nada bloqueia o início da implementação. Duas coisas opcionais, fora do código:

1. **Conferir no Mahjong Soul (quando houver oportunidade)** o honba e o noten do sanma (300/3.000 ou 200/2.000). Se forem diferentes, basta trocar as constantes `honbaRon` e `notenTotal` do sanma.
2. **Retratos** dos três personagens (arte do desenvolvedor).

---

## 17. Apêndices

### 17.1 Modelo de `CLAUDE.md` (colocar na raiz do repositório)

```markdown
# Riichi Mahjong PT-BR — guia rápido para o agente

Especificação completa: docs/spec.md (prevalece sobre qualquer outra coisa).

## Regras que nunca podem ser quebradas
- src/engine/ é TypeScript puro: NÃO importa React, Firebase, DOM, Zustand nem nada fora do engine.
- src/help/ e src/bots/ recebem apenas PlayerView, nunca MatchState.
- A UI só fala com MatchSession; nunca chama o motor direto.
- Toda ação é validada pelo motor. Ações ilegais não são oferecidas.
- Textos de interface em pt-BR via src/i18n; código em inglês.
- TypeScript strict, sem `any`.
- Não copiar assets do Mahjong Soul ou de terceiros sem licença; registrar tudo em CREDITS.md.
- Itens marcados 🔶/❓ no spec: parar e confirmar antes de fixar.

## Comandos
- npm run dev | build | lint | typecheck | test | test:sim

## Fase atual
(atualizar aqui: Fase N — descrição curta)
```

### 17.2 Glossário (termos mantidos em japonês, com explicação em português)

| Termo | Significado |
|---|---|
| Yonma / Sanma | Partida de 4 / de 3 jogadores |
| Manzu / Pinzu / Souzu | Naipes: caracteres / círculos / bambus |
| Honras | Ventos (Leste, Sul, Oeste, Norte) e dragões (Branco, Verde, Vermelho) |
| Chi / Pon / Kan | Chamar sequência / trinca / quadra |
| Riichi | Declarar mão fechada em tenpai, apostando 1.000 pontos |
| Tenpai | Mão a uma peça de ficar completa |
| Yaku | Condição de pontuação; é obrigatório ter ao menos um para vencer |
| Han / Fu | Unidades de valor da mão (pontos de yaku/dora e pontos de composição) |
| Dora / Ura-dora / Aka dora | Peça bônus indicada / bônus sob o indicador (riichi) / cinco vermelho |
| Ron / Tsumo | Vencer com descarte alheio / com a própria compra |
| Furiten | Estado em que não se pode vencer por ron |
| Dealer (oya) | Jogador do vento Leste na rodada |
| Renchan / Honba | Repetição do dealer / contador de repetições (+300 por honba) |
| Nuki-dora (kita) | Sanma: Norte retirado da mão que vale +1 dora |
| Kuitan | Permitir tanyao com mão aberta |
| Kiriage mangan | Arredondar 4 han/30 fu e 3 han/60 fu para mangan |
| Tobi ("Busting") | Fim da partida quando alguém fica abaixo de 0 |
| Han mínimo (shibari) | Mínimo de han exigido para vencer (1, 2 ou 4); sempre com ao menos 1 yaku |
| Modo treino | Opção solo "Mostrar mãos": exibe as mãos dos bots para aprender |

### 17.3 Correções ao conceito visual (não copiar estes erros)

A imagem `Mesa_de_Mahjong_Sob_a_Lua.png` é referência de **estilo**, mas contém erros de regras:

- A mão do jogador mostra **18 peças**; o correto é **13** (14 no momento da compra).
- Os 4 jogadores aparecem com **35.000** pontos; no yonma o padrão é **25.000** (35.000 é do sanma).
- Os ventos dos assentos **não fecham** (há dois "Leste", bússola central trocada). Correto: Leste → Sul → Oeste → Norte em sentido anti-horário.
- O indicador aparece como Leste com dora Dragão Vermelho; pelas regras, indicador **Leste ⇒ dora Sul**.
- Perspectiva exagerada: manter mais suave para legibilidade dos descartes laterais.
- Textos em japonês do menu lateral serão em português: 和了 → "Vitória automática"; 鳴きなし → "Sem chamadas"; 自動整理 → "Organizar mão".

### 17.4 Fontes consultadas para as regras

- riichi.wiki — Mahjong Soul (regras de partida ranqueada, sanma, tsumo-loss): `https://riichi.wiki/Mahjong_Soul`
- riichi.wiki — Comparação de conjuntos de regras populares: `https://riichi.wiki/Comparison_of_popular_rulesets`
- riichi.wiki — Riichi City (comparação de ranqueado yonma/sanma, kita, extensão): `https://riichi.wiki/Riichi_City`
- Regulamento de torneio do Mahjong Soul (EN): `https://mahjongsoul.yo-star.com/tournament/rules.pdf`
- Wikipedia — Japanese mahjong scoring rules (fu, han, limites, pagamentos): `https://en.wikipedia.org/wiki/Japanese_mahjong_scoring_rules`
- Firebase — mudança do Cloud Storage (Blaze obrigatório desde 03/02/2026): `https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024`

> Fim do documento.
