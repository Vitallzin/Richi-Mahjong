/** Galeria das pedras (só em desenvolvimento), para conferir faces, verso e tamanhos. */
import { buildTileSet, type Tile as TileData } from '../../engine';
import { Tile } from '../components/Tile';
import { TileHighlightContext } from '../components/tileHighlight';

/** Exemplo: 1m é dora (brilha), vermelhas brilham e o 中 está "sob o mouse" (destaque). */
const DEMO = { bonusGlow: true, bonusKinds: new Set([0]), matchKind: 33 };

const kinds = (): TileData[] => {
  const all = buildTileSet('yonma', 3);
  const out: TileData[] = [];
  for (let k = 0; k < 34; k++) {
    const normal = all.find((t) => t.kind === k && !t.red);
    if (normal) out.push(normal);
  }
  return [...out, ...all.filter((t) => t.red)];
};

export function DevTiles() {
  const tiles = kinds();
  return (
    <TileHighlightContext.Provider value={DEMO}>
      <main
        style={{
          padding: 24,
          display: 'grid',
          gap: 24,
          background: 'var(--color-felt)',
          minHeight: '100dvh',
        }}
      >
        {[72, 44].map((w) => (
          <div key={w} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tiles.map((t) => (
              <Tile key={`${w}-${t.id}`} tile={t} width={w} />
            ))}
            <Tile tile={null} width={w} />
            <Tile tile={tiles[4] ?? null} width={w} sideways />
            <Tile tile={tiles[20] ?? null} width={w} selected />
          </div>
        ))}
      </main>
    </TileHighlightContext.Provider>
  );
}
