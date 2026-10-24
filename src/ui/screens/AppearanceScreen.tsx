/**
 * /aparencia (spec 11.2, Fase 5 — ADR 0014): fundo, feltro, faces e verso escolhidos de forma
 * independente, com prévia ao vivo. Tudo desbloqueado; a escolha fica neste aparelho.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { parseTiles } from '../../engine';
import { t, tKey } from '../../i18n';
import { useSettings } from '../../state/settings';
import {
  BACKGROUNDS,
  BACKS,
  DEFAULT_APPEARANCE,
  FACES,
  FELTS,
  type Appearance,
  type AppearanceOption,
} from '../../theme/appearance';
import { Backdrop } from '../components/Backdrop';
import { BackLink } from '../components/BackLink';
import { Tile } from '../components/Tile';
import styles from './AppearanceScreen.module.css';
import page from './Page.module.css';

const PREVIEW_FRONT = parseTiles('1m5p0s7s1z6z7z');
const SAMPLE = parseTiles('5p1z6z');

type Axis = keyof Appearance;

/** A prévia é desenhada neste tamanho e escalada para caber na moldura (fica centralizada no celular). */
const SCENE_WIDTH = 640;

function useFitScale() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!el) return;
    // Mede já ao montar (não depende só do ResizeObserver, que pode atrasar) e a cada mudança.
    const fit = () => setScale(el.getBoundingClientRect().width / SCENE_WIDTH || 1);
    const id = setTimeout(fit, 0);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    ro?.observe(el);
    globalThis.addEventListener('resize', fit);
    return () => {
      clearTimeout(id);
      ro?.disconnect();
      globalThis.removeEventListener('resize', fit);
    };
  }, [el]);
  return [setEl, scale] as const;
}

function Sample({ axis, option }: { axis: Axis; option: AppearanceOption<string> }) {
  const style = option.vars as CSSProperties;
  if (axis === 'background') {
    return (
      <span className={styles.sky} style={style} aria-hidden="true">
        <span className={styles.skyMoon} />
        <span className={styles.skyRoof} />
      </span>
    );
  }
  if (axis === 'felt') {
    return <span className={styles.feltSwatch} style={style} aria-hidden="true" />;
  }
  return (
    <span className={styles.tiles} style={style} aria-hidden="true">
      {axis === 'faces'
        ? SAMPLE.map((tile) => <Tile key={tile.id} tile={tile} width={30} />)
        : [0, 1, 2].map((i) => <Tile key={i} tile={null} width={30} />)}
    </span>
  );
}

function Picker<Id extends string>({
  axis,
  options,
  value,
  onPick,
}: {
  axis: Axis;
  options: readonly AppearanceOption<Id>[];
  value: Id;
  onPick: (id: Id) => void;
}) {
  const title = t(`appearance.${axis}`);
  return (
    <section className={page.section} aria-labelledby={`ap-${axis}`}>
      <h2 id={`ap-${axis}`}>{title}</h2>
      <div className={styles.grid} role="radiogroup" aria-label={title}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === value}
            className={o.id === value ? styles.optionOn : styles.option}
            onClick={() => onPick(o.id)}
          >
            <Sample axis={axis} option={o} />
            <span className={styles.optionName}>
              <span className={styles.glyph} aria-hidden="true">
                {o.glyph}
              </span>
              {tKey(`appearance.${axis}.${o.id}`)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function AppearanceScreen() {
  const appearance = useSettings((s) => s.appearance);
  const set = useSettings((s) => s.set);
  // Lê o valor mais recente: cliques seguidos não se sobrescrevem.
  const pick = (patch: Partial<Appearance>) =>
    set({ appearance: { ...useSettings.getState().appearance, ...patch } });
  const [fitRef, scale] = useFitScale();

  return (
    <main className={page.page}>
      <header className={page.header}>
        <BackLink />
        <h1 className={page.title}>{t('appearance.title')}</h1>
      </header>
      <p className={page.lead}>{t('appearance.lead')}</p>

      <figure ref={fitRef} className={styles.preview} aria-label={t('appearance.preview')}>
        <Backdrop contained />
        <div className={styles.scene} style={{ '--scale': scale } as CSSProperties}>
          <div className={styles.table}>
            <div className={styles.felt}>
              <div className={styles.row}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Tile key={i} tile={null} width={26} />
                ))}
              </div>
              <div className={styles.row}>
                {PREVIEW_FRONT.map((tile) => (
                  <Tile key={tile.id} tile={tile} width={40} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <figcaption className={styles.caption}>{t('appearance.preview')}</figcaption>
      </figure>

      <Picker
        axis="background"
        options={BACKGROUNDS}
        value={appearance.background}
        onPick={(background) => pick({ background })}
      />
      <Picker
        axis="felt"
        options={FELTS}
        value={appearance.felt}
        onPick={(felt) => pick({ felt })}
      />
      <Picker
        axis="faces"
        options={FACES}
        value={appearance.faces}
        onPick={(faces) => pick({ faces })}
      />
      <Picker
        axis="back"
        options={BACKS}
        value={appearance.back}
        onPick={(back) => pick({ back })}
      />

      <div className={page.buttons}>
        <button
          type="button"
          className={page.secondary}
          onClick={() => set({ appearance: DEFAULT_APPEARANCE })}
        >
          {t('appearance.restore')}
        </button>
        <span className={page.desc}>{t('appearance.note')}</span>
      </div>
    </main>
  );
}
