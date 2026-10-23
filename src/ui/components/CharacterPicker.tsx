/**
 * Escolha de personagem de um bot (configuração e lobby da sala): no lugar do <select> do navegador,
 * uma lista no estilo do jogo com o selo de cada personagem. Acessível como listbox: setas, Enter,
 * Esc e clique fora fecham.
 */
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { CharacterId } from '../../bots';
import type { PickerOption } from './characterOptions';
import styles from './CharacterPicker.module.css';
import { CHARACTER_ART } from './seatPortrait';

function Seal({ character }: { character: CharacterId | undefined }) {
  const art = character ? CHARACTER_ART[character] : null;
  return (
    <span
      className={styles.seal}
      style={
        (art ? { '--a': art.colors[0], '--b': art.colors[1] } : undefined) as
          CSSProperties | undefined
      }
      aria-hidden="true"
    >
      {art ? art.glyph : '?'}
    </span>
  );
}

export function CharacterPicker<V extends string>({
  value,
  options,
  label,
  onChange,
}: {
  value: V;
  options: readonly PickerOption<V>[];
  /** Nome acessível (ex.: "Assento 1"). */
  label: string;
  onChange: (value: V) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const show = () => {
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };

  const pick = (o: PickerOption<V> | undefined) => {
    if (o) onChange(o.value);
    setOpen(false);
    root.current?.querySelector('button')?.focus();
  };

  const onListKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + step + options.length) % options.length);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') e.preventDefault();
      setOpen(false);
      if (e.key === 'Escape') root.current?.querySelector('button')?.focus();
    }
  };

  return (
    <div ref={root} className={styles.picker}>
      <button
        type="button"
        className={open ? styles.triggerOpen : styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selected?.name ?? ''}`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            show();
          }
        }}
      >
        <Seal character={selected?.character} />
        <span className={styles.text}>
          <span className={styles.name}>{selected?.name}</span>
          {selected?.tag && <span className={styles.tag}>{selected.tag}</span>}
        </span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={list}
          className={styles.list}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={`${styles.option} ${i === active ? styles.active : ''}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(o)}
            >
              <Seal character={o.character} />
              <span className={styles.text}>
                <span className={styles.name}>{o.name}</span>
                {o.tag && <span className={styles.tag}>{o.tag}</span>}
              </span>
              {o.value === value && <span className={styles.check} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
