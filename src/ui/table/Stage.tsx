/**
 * Palco de resolução fixa 1600×900 (spec 10.2), escalado com transform para caber na tela. Se o
 * aparelho está em pé e não foi possível travar a orientação, o palco gira 90° (spec 10.6).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useNeedsRotation } from '../platform/display';
import styles from './Stage.module.css';

export const STAGE_W = 1600;
export const STAGE_H = 900;

function useViewport() {
  const read = () => ({ w: globalThis.innerWidth, h: globalThis.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const update = () => setSize(read());
    globalThis.addEventListener('resize', update);
    return () => globalThis.removeEventListener('resize', update);
  }, []);
  return size;
}

export function Stage({ children, background }: { children: ReactNode; background?: ReactNode }) {
  const { w, h } = useViewport();
  const rotate = useNeedsRotation();
  const vw = rotate ? h : w;
  const vh = rotate ? w : h;
  const scale = Math.min(vw / STAGE_W, vh / STAGE_H);
  return (
    <div className={styles.viewport}>
      <div
        className={styles.rotator}
        style={{
          width: vw,
          height: vh,
          transform: rotate ? `translate(${w}px, 0) rotate(90deg)` : undefined,
        }}
      >
        <div className={styles.backdrop}>{background}</div>
        <div
          className={styles.stage}
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
