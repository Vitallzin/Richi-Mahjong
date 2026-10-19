/**
 * Gera src/ui/styles/fonts.css só com as fatias (@font-face) das fontes auto-hospedadas que contêm
 * caracteres usados pelo jogo (spec 11.4: subset latino + subset mínimo dos hanzi). Sem isso, cada
 * peso declara ~100 fatias (~105 KB de CSS) e o primeiro carregamento no celular fica pesado.
 *   npm run fonts   (rodar de novo quando entrarem textos com hanzi novos)
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// Noto Sans SC: texto da interface, só latim (o peso 500 cai no 400). Shippori Mincho: hanzi das pedras,
// decorações e ícones (também é o fallback de hanzi do texto), só o peso 800 e só fatias com hanzi.
const FONTS = [
  { pkg: '@fontsource/noto-sans-sc', weights: [400, 700], script: 'latin' },
  { pkg: '@fontsource/shippori-mincho', weights: [800], script: 'cjk' },
];
const OUT = 'src/ui/styles/fonts.css';

/** Todos os caracteres usados no código, textos e tutorial, + ASCII e Latin-1 (nomes digitados). */
function usedCodePoints() {
  const set = new Set();
  for (let c = 0x20; c <= 0x7e; c++) set.add(c);
  for (let c = 0xa0; c <= 0x17f; c++) set.add(c);
  for (const c of '–—‘’“”…·•←→↑↓✓×') set.add(c.codePointAt(0));
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx|md|css)$/.test(name) && !name.includes('.test.')) {
        for (const ch of readFileSync(path, 'utf8')) {
          const cp = ch.codePointAt(0);
          if (cp > 0x7f) set.add(cp);
        }
      }
    }
  };
  walk('src');
  return set;
}

function ranges(spec) {
  return spec.split(',').map((part) => {
    const r = part.trim().replace(/^U\+/i, '');
    if (r.includes('-')) {
      const [a, b] = r.split('-');
      return [parseInt(a, 16), parseInt(b, 16)];
    }
    if (r.includes('?')) {
      return [parseInt(r.replace(/\?/g, '0'), 16), parseInt(r.replace(/\?/g, 'f'), 16)];
    }
    const v = parseInt(r, 16);
    return [v, v];
  });
}

const used = usedCodePoints();
const inScript = (cp, script) => (script === 'cjk' ? cp >= 0x2e80 : cp < 0x2e80);
const intersects = (spec, script) =>
  ranges(spec).some(([a, b]) => {
    for (const cp of used) if (inScript(cp, script) && cp >= a && cp <= b) return true;
    return false;
  });

let out =
  '/* Gerado por scripts/gen-fonts.mjs — não editar à mão. Só as fatias com caracteres usados. */\n';
let kept = 0;
let total = 0;
for (const { pkg, weights, script } of FONTS) {
  for (const w of weights) {
    const file = join('node_modules', pkg, `${w}.css`);
    const css = readFileSync(file, 'utf8');
    for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
      total += 1;
      const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1];
      // Latim: só as fatias latin/latin-ext (as fatias de CJK também cobrem pontuação e confundiriam).
      if (script === 'latin' && !/-latin(-ext)?-\d+-/.test(block)) continue;
      if (range && !intersects(range, script)) continue;
      kept += 1;
      const rel = relative('src/ui/styles', join('node_modules', pkg)).replace(/\\/g, '/');
      out += block.replace(/url\(\.\/files\//g, `url(${rel}/files/`) + '\n';
    }
  }
}
writeFileSync(OUT, out);
console.log(`${OUT}: ${kept} de ${total} fatias (${used.size} caracteres usados)`);
