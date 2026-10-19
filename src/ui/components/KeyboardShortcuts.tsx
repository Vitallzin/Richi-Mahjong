/** Atalhos de teclado (spec 10.3) em teclas desenhadas, com os mesmos selos das ações da mesa. */
import { t } from '../../i18n';
import { ACTION_ICONS, ACTION_KEYS, actionLabel, type ActionKey } from '../table/actions';
import styles from './KeyboardShortcuts.module.css';

const ACTIONS: readonly ActionKey[] = [
  'tsumo',
  'ron',
  'riichi',
  'chi',
  'pon',
  'kan',
  'kita',
  'kyuushu',
  'pass',
];

const keyName = (key: string) => (key === 'Escape' ? 'Esc' : key.toUpperCase());

export function KeyboardShortcuts() {
  return (
    <section className={styles.section} aria-labelledby="kbd-title">
      <h2 id="kbd-title" className={styles.title}>
        {t('helps.keyboard.title')}
      </h2>
      <p className={styles.lead}>{t('helps.keyboard.lead')}</p>

      <h3 className={styles.group}>{t('helps.keyboard.hand')}</h3>
      <ul className={styles.grid}>
        <li className={styles.item}>
          <span className={styles.keys}>
            <kbd className={styles.key} aria-label={t('helps.keyboard.left')}>
              ←
            </kbd>
            <kbd className={styles.key} aria-label={t('helps.keyboard.right')}>
              →
            </kbd>
          </span>
          <span className={styles.label}>{t('helps.keyboard.choose')}</span>
        </li>
        <li className={styles.item}>
          <span className={styles.keys}>
            <kbd className={`${styles.key} ${styles.wide}`}>Enter</kbd>
          </span>
          <span className={styles.label}>{t('helps.keyboard.discard')}</span>
        </li>
      </ul>

      <h3 className={styles.group}>{t('helps.keyboard.actions')}</h3>
      <ul className={styles.grid}>
        {ACTIONS.map((a) => (
          <li key={a} className={styles.item}>
            <span className={styles.keys}>
              <kbd className={`${styles.key} ${a === 'pass' ? styles.wide : ''}`}>
                {keyName(ACTION_KEYS[a])}
              </kbd>
            </span>
            <span className={`${styles.icon} ${styles[`icon_${a}`]}`} aria-hidden="true">
              {ACTION_ICONS[a]}
            </span>
            <span className={styles.label}>{actionLabel(a)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
