/**
 * Botões de jogadas disponíveis (spec 9.5): cores consistentes, sempre com texto e ícone, e "Passar".
 * Nunca executa chamada sozinho.
 */
import { t } from '../../i18n';
import { ACTION_KEYS, type ActionKey } from './actions';
import styles from './Table.module.css';

const ICONS: Record<ActionKey, string> = {
  tsumo: '✦',
  ron: '✦',
  riichi: '▮',
  kan: '▦',
  pon: '◆',
  chi: '➜',
  kita: '北',
  kyuushu: '九',
  pass: '✕',
};

const LABEL: Record<ActionKey, () => string> = {
  tsumo: () => t('action.tsumo'),
  ron: () => t('action.ron'),
  riichi: () => t('action.riichi'),
  kan: () => t('action.kan'),
  pon: () => t('action.pon'),
  chi: () => t('action.chi'),
  kita: () => t('action.kita'),
  kyuushu: () => t('action.kyuushu'),
  pass: () => t('action.pass'),
};

export function ActionBar({
  actions,
  onAction,
}: {
  actions: readonly ActionKey[];
  onAction: (a: ActionKey) => void;
}) {
  if (actions.length === 0) return null;
  return (
    <div className={styles.actionBar} role="toolbar" aria-label={t('table.yourTurn')}>
      {actions.map((a) => (
        <button
          key={a}
          type="button"
          className={`${styles.actionButton} ${styles[`action_${a}`]}`}
          onClick={() => onAction(a)}
          aria-keyshortcuts={ACTION_KEYS[a]}
        >
          <span aria-hidden="true" className={styles.actionIcon}>
            {ICONS[a]}
          </span>
          {LABEL[a]()}
        </button>
      ))}
    </div>
  );
}
