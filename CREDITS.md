# Créditos

Todo asset de terceiros (fonte, som, ícone, imagem) deve constar aqui com licença e URL (spec 0.3).

## Código (dependências npm)

As bibliotecas usadas estão em `package.json`; cada uma segue sua própria licença (MIT na maioria).
Destaques: React, React Router, Zustand, Firebase JS SDK (Apache-2.0), Howler.js (MIT).

## Fontes

- **Cinzel** — The Cinzel Project Authors (SIL Open Font License 1.1). Títulos.
  Arquivo variável fornecido pelo desenvolvedor: `public/fonts/Cinzel-Variable.ttf` (e a mesma fonte
  convertida para `.woff2`, mais leve; licença em
  `public/fonts/Cinzel-OFL.txt`) — https://github.com/NDISCOVER/Cinzel
- **Noto Sans SC** — Adobe/Google (SIL Open Font License 1.1). Interface. Via `@fontsource/noto-sans-sc`
  (mesma fonte do Google Fonts, fatiada em subconjuntos woff2) —
  https://fonts.google.com/noto/specimen/Noto+Sans+SC
- **Shippori Mincho** — Fontdasu (SIL Open Font License 1.1). Faces das pedras e hanzi decorativos.
  Via `@fontsource/shippori-mincho` — https://fonts.google.com/specimen/Shippori+Mincho

## Sons

- `public/sounds/*.wav` — sintetizados por `scripts/gen-sounds.mjs` (síntese modal + reverberação; arte
  original do projeto, sem gravações de terceiros). Reprodução com **Howler.js** (MIT) — https://howlerjs.com

## Música

- Música ambiente composta ao vivo por `src/audio/music.ts` (síntese Web Audio; arte original, sem
  arquivos de terceiros). Sons de hover em `src/audio/hover.ts`.

## Imagens e ícones

- Cenário (céu, pagode, lanternas, pétalas) e ornamentos — desenho próprio em SVG/CSS.
- Faces das pedras — desenho próprio em CSS (`src/ui/components/tileFaces.ts`), tema "Noite de Sakura".
- `public/icons/*` — gerados por `scripts/gen-icons.mjs` (arte original do projeto).
- `docs/concept/Mesa_de_Mahjong_Sob_a_Lua.png` — imagem de conceito do desenvolvedor (referência visual).
