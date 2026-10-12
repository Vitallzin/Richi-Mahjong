# Créditos

Todo asset de terceiros (fonte, som, ícone, imagem) deve constar aqui com licença e URL (spec 0.3).

## Código (dependências npm)

As bibliotecas usadas estão em `package.json`; cada uma segue sua própria licença (MIT na maioria).
Destaques: React, React Router, Zustand, Firebase JS SDK (Apache-2.0), Howler.js (MIT).

## Fontes

- **Shippori Mincho** — Fontdasu (SIL Open Font License 1.1). Títulos e faces das pedras (kanji).
  Via `@fontsource/shippori-mincho` — https://fonts.google.com/specimen/Shippori+Mincho
- **M PLUS 1p** — Coji Morishita / M+ FONTS PROJECT (SIL Open Font License 1.1). Texto corrido e
  botões. Via `@fontsource/m-plus-1p` — https://fonts.google.com/specimen/M+PLUS+1p

## Sons

- `public/sounds/*.wav` — sintetizados por `scripts/gen-sounds.mjs` (arte original do projeto, sem
  gravações de terceiros). Reprodução com **Howler.js** (MIT) — https://howlerjs.com

## Imagens e ícones

- Faces das pedras — desenho próprio em CSS (`src/ui/components/tileFaces.ts`), tema "Noite de Sakura".
- `public/icons/*` — gerados por `scripts/gen-icons.mjs` (arte original do projeto).
- `docs/concept/Mesa_de_Mahjong_Sob_a_Lua.png` — imagem de conceito do desenvolvedor (referência visual).
