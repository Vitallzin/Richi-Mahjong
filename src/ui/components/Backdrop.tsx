/**
 * Cenário "Noite de Sakura": céu, lua, telhados de pagode em silhueta, lanternas e pétalas.
 * Desenho próprio em SVG/CSS. Decorativo (aria-hidden); movimento some com "reduzir movimento".
 */
import styles from './Backdrop.module.css';

const PETALS = Array.from({ length: 9 }, (_, i) => i);

function Lantern({ x, delay, scale }: { x: string; delay: string; scale: number }) {
  return (
    <span
      className={styles.lantern}
      style={{ left: x, animationDelay: delay, transform: `scale(${scale})` }}
    >
      <span className={styles.cord} />
      <span className={styles.lanternBody}>
        <span className={styles.lanternGlyph}>福</span>
      </span>
      <span className={styles.tassel} />
    </span>
  );
}

export function Backdrop({ dim = false }: { dim?: boolean }) {
  return (
    <div className={`${styles.backdrop} ${dim ? styles.dim : ''}`} aria-hidden="true">
      <div className={styles.moon} />
      <svg className={styles.skyline} viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="bd-roof" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#2b1d45" />
            <stop offset="1" stopColor="#140d22" />
          </linearGradient>
        </defs>
        {/* pagode distante */}
        <g fill="#1d1431" opacity="0.9">
          <path d="M1180 400V250h-50l70-30h-40l60-34h-30l46-30 46 30h-30l60 34h-40l70 30h-50v150z" />
          <rect x="1198" y="140" width="4" height="22" />
        </g>
        {/* telhados próximos, com beiral curvado */}
        <g fill="url(#bd-roof)">
          <path d="M0 400V300c80 0 120-30 190-46 30 10 60 28 120 28 70 0 110-40 180-54 60 14 80 40 150 40v132z" />
          <path d="M520 400V320c90 4 150-36 230-52 40 14 80 34 160 34 90 0 130-34 210-50 70 18 120 44 190 44 60 0 120-20 170-34 40 12 70 26 120 30v98z" />
        </g>
        <g stroke="#d6ad60" strokeOpacity="0.18" strokeWidth="2" fill="none">
          <path d="M60 300c80 0 120-30 190-46 30 10 60 28 120 28" />
          <path d="M600 322c90 4 150-36 230-52 40 14 80 34 160 34" />
        </g>
      </svg>
      <Lantern x="6%" delay="0s" scale={1} />
      <Lantern x="16%" delay="-1.6s" scale={0.72} />
      <Lantern x="84%" delay="-0.8s" scale={0.85} />
      <Lantern x="93%" delay="-2.4s" scale={0.62} />
      <div className={styles.petals}>
        {PETALS.map((i) => (
          <span
            key={i}
            className={styles.petal}
            style={{
              left: `${(i * 37) % 100}%`,
              animationDelay: `${-i * 2.3}s`,
              animationDuration: `${14 + (i % 4) * 3}s`,
            }}
          />
        ))}
      </div>
      <div className={styles.vignette} />
    </div>
  );
}
