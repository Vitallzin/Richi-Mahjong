/**
 * Markdown mínimo do tutorial: títulos (#, ##, ###), parágrafos, listas (-), citações (>), **negrito**,
 * *itálico* e peças `[[123m]]` desenhadas com o componente Tile. Nada de HTML cru.
 */
import type { ReactNode } from 'react';
import { parseTiles } from '../../engine';
import { Tile } from '../components/Tile';
import { parseBlocks } from './markdownParse';
import styles from './Tutorial.module.css';

const INLINE = /(\[\[[0-9mpsz]+\]\]|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;

function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('[[') && part.endsWith(']]')) {
      return (
        <span key={key} className={styles.tiles}>
          {parseTiles(part.slice(2, -2)).map((tile) => (
            <Tile key={tile.id} tile={tile} width={34} />
          ))}
        </span>
      );
    }
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    const italic =
      (part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'));
    if (italic && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function Markdown({ source }: { source: string }) {
  return (
    <>
      {parseBlocks(source).map((b, i) => {
        const key = `b${i}`;
        switch (b.kind) {
          case 'h':
            return b.level === 1 ? (
              <h1 key={key} className={styles.h1}>
                {inline(b.text, key)}
              </h1>
            ) : b.level === 2 ? (
              <h2 key={key} className={styles.h2}>
                {inline(b.text, key)}
              </h2>
            ) : (
              <h3 key={key} className={styles.h3}>
                {inline(b.text, key)}
              </h3>
            );
          case 'p':
            return (
              <p key={key} className={styles.p}>
                {inline(b.text, key)}
              </p>
            );
          case 'ul':
            return (
              <ul key={key} className={styles.ul}>
                {b.items.map((item, j) => (
                  <li key={j}>{inline(item, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case 'quote':
            return (
              <blockquote key={key} className={styles.quote}>
                {inline(b.text, key)}
              </blockquote>
            );
        }
      })}
    </>
  );
}
