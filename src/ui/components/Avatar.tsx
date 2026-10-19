/** Avatar do jogador: hanzi sobre laca (temático) ou a foto da conta Google (spec 12.5). */
import type { CSSProperties } from 'react';
import { avatarById, GOOGLE_AVATAR } from '../../state/profile';
import styles from './Avatar.module.css';

export function Avatar({
  avatar,
  photoURL,
  size = 48,
}: {
  avatar: string;
  photoURL?: string | null;
  size?: number;
}) {
  const style = { '--size': `${size}px` } as CSSProperties;
  if (avatar === GOOGLE_AVATAR && photoURL) {
    return (
      <img
        className={styles.avatar}
        style={style}
        src={photoURL}
        alt=""
        referrerPolicy="no-referrer"
        draggable={false}
      />
    );
  }
  const def = avatarById(avatar);
  return (
    <span
      className={styles.avatar}
      style={{ ...style, '--a': def.colors[0], '--b': def.colors[1] } as CSSProperties}
      aria-hidden="true"
    >
      {def.glyph}
    </span>
  );
}
