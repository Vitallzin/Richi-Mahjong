// Gera os ícones do PWA (placeholders originais) sem dependências: rasteriza formas simples
// e codifica PNG com zlib. Uso: `npm run icons`.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '..', 'public', 'icons');

const COLORS = {
  bg: [42, 33, 69],
  glow: [75, 58, 140],
  tile: [246, 240, 226],
  tileEdge: [201, 189, 160],
  gold: [217, 179, 106],
  red: [196, 48, 62],
};

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // profundidade
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const insideRoundRect = (x, y, cx, cy, w, h, r) => {
  const dx = Math.max(Math.abs(x - cx) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (h / 2 - r), 0);
  return dx * dx + dy * dy <= r * r;
};

/** Cor de um ponto em coordenadas normalizadas (0..1). `safe` reduz o desenho (ícone maskable). */
function shade(u, v, { rounded, safe }) {
  const s = safe ? 0.78 : 1;
  const x = (u - 0.5) / s + 0.5;
  const y = (v - 0.5) / s + 0.5;
  if (rounded && !insideRoundRect(u, v, 0.5, 0.5, 1, 1, 0.18)) return null;
  const d = Math.hypot(u - 0.5, v - 0.35);
  const t = Math.min(d / 0.7, 1);
  let color = COLORS.glow.map((c, i) => c + (COLORS.bg[i] - c) * t);
  if (insideRoundRect(x, y, 0.53, 0.53, 0.46, 0.62, 0.07)) color = COLORS.tileEdge;
  if (insideRoundRect(x, y, 0.5, 0.5, 0.46, 0.62, 0.07)) color = COLORS.tile;
  const ring = Math.hypot(x - 0.5, y - 0.5);
  if (ring <= 0.15 && ring >= 0.115) color = COLORS.gold;
  if (ring <= 0.085) color = COLORS.red;
  return color;
}

function render(size, options) {
  const SS = 4; // supersampling para bordas suaves
  const rgba = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = shade((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, options);
          if (!c) continue;
          r += c[0];
          g += c[1];
          b += c[2];
          a += 1;
        }
      }
      const o = (py * size + px) * 4;
      rgba[o] = a ? Math.round(r / a) : 0;
      rgba[o + 1] = a ? Math.round(g / a) : 0;
      rgba[o + 2] = a ? Math.round(b / a) : 0;
      rgba[o + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
  return encodePng(size, rgba);
}

mkdirSync(OUT, { recursive: true });
const targets = [
  ['icon-192.png', 192, { rounded: true, safe: false }],
  ['icon-512.png', 512, { rounded: true, safe: false }],
  ['icon-512-maskable.png', 512, { rounded: false, safe: true }],
  ['apple-touch-icon.png', 180, { rounded: false, safe: false }],
];
for (const [name, size, options] of targets) {
  writeFileSync(path.join(OUT, name), render(size, options));
  console.log(`ícone gerado: public/icons/${name}`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#2a2145"/>
  <rect x="19" y="14" width="29.5" height="39.7" rx="4.5" fill="#c9bda0"/>
  <rect x="17.3" y="12.2" width="29.5" height="39.7" rx="4.5" fill="#f6f0e2"/>
  <circle cx="32" cy="32" r="8.5" fill="none" stroke="#d9b36a" stroke-width="2.3"/>
  <circle cx="32" cy="32" r="5.4" fill="#c4303e"/>
</svg>
`;
writeFileSync(path.join(OUT, 'favicon.svg'), svg);
console.log('ícone gerado: public/icons/favicon.svg');
