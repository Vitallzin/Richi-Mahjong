# 0011 — Visual com ar chinês, animações e ritmo da mesa

Pedido do desenvolvedor (14/10/2026), antes da Fase 4.

## Visual

- **Fontes:** Cinzel nos títulos (arquivo variável do desenvolvedor, auto-hospedado); Noto Sans SC na
  interface, via `@fontsource/noto-sans-sc` (os TTF estáticos têm ~10 MB cada; o pacote fatia a mesma fonte
  em woff2 por faixa de caracteres). Shippori Mincho continua nas faces das pedras e nos hanzi decorativos.
- **Paleta:** base noturna `#120d1f`, laca `#2a1a3a`, ouro `#d6ad60`, cinábrio `#b8322a`, jade `#3f8f78`,
  papel de arroz `#f3ead6` (tokens em `global.css`). O tema continua sendo "Noite de Sakura" (spec 11.1),
  com acabamento chinês: laca com filete duplo dourado, nuvens no feltro, lanternas, telhados de pagode.
- **Assinatura:** o selo de cinábrio (印章) — no limite da mão (満貫 Mangan…), nos anúncios de chamada e nas
  colocações (一二三四). Os botões de ação levam o hanzi da jogada (吃 碰 杠 立直 荣 自摸 过) e o nome em
  português (spec 9.5: nunca só cor).
- **Vez:** a borda do octógono central acende do lado de quem joga, o retrato ganha anel dourado girando e
  o jogador vê a placa "Sua vez" com o relógio.

## Fim de mão "como no Mahjong Soul"

Mesmo **fluxo** (arte e sons próprios — spec 0.3 proíbe copiar assets): anúncio em tela cheia
(荣 Ron! / 自摸 Tsumo! / 流局) → mão revelada, yaku um a um com o han, han/fu e selo do limite, contagem dos
pontos → placar dos quatro assentos com moedas voando de quem paga para quem recebe e números rolando →
Continuar. Clicar pula a animação da etapa. Ron múltiplo mostra uma tela por vencedor.

## Ritmo

As animações dão o ritmo da mesa: `src/session/pacing.ts` define a duração do voo da pedra (380 ms), dos
anúncios (1,1 s) e do início de mão (1,2 s); a `LocalSession` espera essa pausa antes de qualquer bot agir
e antes de ligar o relógio do jogador. Os bots ainda somam o atraso "humano" (650–1400 ms no turno,
250–650 ms nas chamadas). Testes e simulações usam `NO_DELAYS` (sem pausa).

## Som

Novo gerador: síntese modal (pedra com estalo + corpo de madeira; sinos de bronze; gongo) e reverberação de
sala; carrilhões na pentatônica chinesa. Sons novos: carimbo do selo, moedas do placar, deslocamento das
moedas e aviso de chamada disponível. Volume relativo por som em `src/audio/sounds.ts`; o estalo do descarte
toca quando a pedra pousa.
