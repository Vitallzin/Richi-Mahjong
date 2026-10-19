# 0018 — Fase 6: bot Difícil, personagens e acabamento

Liberada pelo desenvolvedor em 19/10/2026.

## Bot Difícil (spec 8.2)

IA própria em `src/bots/hard/`, só com `PlayerView` (a barreira de tipos continua valendo):

- **Eficiência:** shanten, ukeire e, entre opções 1-shanten, a "qualidade do tenpai" (quantas peças
  vencem no melhor tenpai alcançável por cada compra).
- **Valor esperado das esperas:** para cada descarte que deixa em tenpai, peças restantes × pontos do
  ron (com e sem riichi), calculados pelo próprio `scoreHand` do motor.
- **Defesa por risco de peça:** genbutsu (incluindo o que passou depois do riichi), suji, meio-suji,
  kabe, honras vistas, terminais; ameaças = riichi e mãos abertas com 2+/3+ grupos; dealer pesa mais.
- **Avançar ou recuar:** fator de "push" pela distância do tenpai, valor da mão, estilo e placar
  (última mão: 1º com folga segura; último lugar arrisca).
- **Riichi × dama:** declara sem yaku ou com mão barata; mantém dama com mão cara ou na última mão em 1º.
- **Chamadas:** só com caminho de yaku; pon de honra de valor quase sempre; mão fechada boa só abre
  para ficar em tenpai; com ameaça na mesa, só chama se ficar em tenpai.
- Pouco ruído (desempate). O estilo do personagem ajusta pesos (velocidade, valor, defesa, risco,
  riichi, chamadas), como nos outros níveis.

**Aceite (arena, `npm run arena`, 200 partidas yonma Leste-Sul, assentos alternados):**

| Confronto        | Colocação média | Pontos médios   |
| ---------------- | --------------- | --------------- |
| Difícil × Normal | 2,29 × 2,71     | 27.772 × 22.228 |
| Difícil × Fácil  | 1,89 × 3,11     | 35.001 × 14.999 |

Decisão mais lenta do Difícil: ~0,4 s com a máquina carregada (no Worker, não trava a mesa).

## Execução no Web Worker (spec 8.4)

- `src/bots/worker.ts` recebe a `PlayerView` serializada e devolve a ação; `workerClient.ts` numera os
  pedidos. Só o Difícil vai para o Worker (Fácil/Normal decidem em < 50 ms na thread principal).
- A sessão pede a decisão logo e aplica quando a resposta chegou **e** o atraso "humano" passou; se o
  Worker falhar, decide na thread principal. Testes e simulações usam os bots direto (síncronos).

## Personagens

- Retratos próprios em CSS (selo com hanzi e cores): Ren 蓮, Akari 灯, Sora 空. Retratos WebP do
  desenvolvedor podem substituir em `seatPortrait.ts` sem mudar quem usa.
- Falas curtas ao declarar riichi e ao vencer (balão ao lado da placa, some sozinho).

## Desempenho no celular

- Telas carregadas sob demanda (`React.lazy`); o menu não carrega motor nem bots.
- `npm run fonts` gera `src/ui/styles/fonts.css` só com as fatias usadas: Noto Sans SC só latim (o peso
  500 cai no 400) e Shippori Mincho 800 só com os hanzi do jogo (também fallback de hanzi do texto).
  CSS inicial: 645 KB → 55 KB. Cinzel convertida para WOFF2 (126 KB → 49 KB) e pré-carregada.
- Registro do service worker com `defer`; todas as fontes usadas entram no precache (offline completo).
- Lighthouse (celular simulado, build de produção): Desempenho 80, Acessibilidade 100, Boas práticas 100.

## Temas

- Trocar tema não exige código: aparência são dados (`src/theme/appearance.ts`, ADR 0017); faces,
  versos, feltros e cenários leem variáveis CSS.
