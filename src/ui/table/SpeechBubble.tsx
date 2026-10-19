/**
 * Falas curtas dos personagens (spec 8.3): ao declarar riichi ou vencer, um balão aparece ao lado da
 * placa por alguns segundos e some sozinho (animação CSS). Só bots falam.
 */
import type { Speech } from './useSpeech';
import styles from './Table.module.css';

export function SpeechBubble({ speech, side }: { speech: Speech; side: number }) {
  return (
    <span key={speech.tick} className={`${styles.speech} ${styles[`speech${side}`]}`} role="status">
      {speech.text}
    </span>
  );
}
