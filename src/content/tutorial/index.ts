/** Capítulos do tutorial (spec 10.8), em Markdown. Texto a revisar pelo desenvolvedor. */
import pedras from './01-pedras.md?raw';
import mao from './02-mao.md?raw';
import vencer from './03-vencer.md?raw';
import acoes from './04-acoes.md?raw';
import pontuacao from './05-pontuacao.md?raw';
import modos from './06-modos.md?raw';

export interface Chapter {
  readonly slug: string;
  readonly title: string;
  readonly source: string;
}

const titleOf = (source: string) => /^#\s+(.*)$/m.exec(source)?.[1] ?? '';

export const CHAPTERS: readonly Chapter[] = [
  { slug: 'pedras', source: pedras },
  { slug: 'mao', source: mao },
  { slug: 'vencer', source: vencer },
  { slug: 'acoes', source: acoes },
  { slug: 'pontuacao', source: pontuacao },
  { slug: 'modos', source: modos },
].map((c) => ({ ...c, title: titleOf(c.source) }));
