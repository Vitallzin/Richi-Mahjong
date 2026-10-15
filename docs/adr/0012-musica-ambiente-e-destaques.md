# 0012 — Música ambiente, sons de hover e destaques de peças

Pedido do desenvolvedor (15/10/2026). **Substitui "Sem música" da spec (2 e 11.5).**

## Música ambiente generativa

- Composta ao vivo no navegador com Web Audio (`src/audio/music.ts`), sem arquivos: guzheng sintetizado
  (parciais com deslize de afinação no ataque) na pentatônica de Ré, colchão de quintas abertas, baixo
  suave, sinos de vento ocasionais e reverberação gerada. Nunca repete igual e não pesa no download/PWA.
- Dois climas: **menu** (64 bpm, mais melodia) e **mesa** (54 bpm, mais espaço, para não atrapalhar).
- Começa no primeiro gesto do usuário (política de autoplay). Liga/desliga e volume próprio em
  Configurações e botão "Música" na mesa; o volume final é geral × música, e "Sem som" silencia tudo.
- O desenvolvedor mencionou um plugin para gerar sons; nenhuma ferramenta de áudio estava disponível na
  sessão. Se faixas gravadas forem adicionadas depois, entram no lugar do motor sem mudar a interface.

## Som ao passar o mouse

- Toque curto afinado na mesma pentatônica (`src/audio/hover.ts`): "tok" de bambu em botões/links/opções
  e estalo leve de pedra nas peças da mão. Só com mouse, só ao entrar num elemento novo, no máximo a cada
  45 ms (varrer a mão soa como um arpejo). Desligável em Configurações.

## Destaques (camada de ajudas, independente do tema)

- **Brilho nas peças de bônus:** dora atual e cincos vermelhos têm filete dourado interno, halo que respira
  (dourado na dora, rosado na vermelha) e um reflexo que atravessa a face. Ajuda "Brilho nas peças de
  bônus", ligada por padrão.
- **Destacar peças já vistas:** ao passar o mouse (ou tocar) numa peça da mão, as cópias visíveis na mesa
  (rios, grupos expostos, indicadores) ganham contorno dourado pulsante, e um selo mostra "N já visíveis na
  mesa". Usa só informação pública (PlayerView). Ajuda "Destacar peças já vistas", ligada por padrão.
- Ambos respeitam "reduzir movimento" (sem animação, destaque estático).
