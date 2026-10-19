/**
 * Botões de jogadas disponíveis (spec 9.5): cores consistentes, sempre com texto e ícone, e "Passar".
 * Nunca executa chamada sozinho.
 */
import { t } from '../../i18n';
import { ACTION_ICONS as ICONS, ACTION_KEYS, actionLabel, type ActionKey } from './actions';
import styles from './Table.module.css';

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
          {actionLabel(a)}
        </button>
      ))}
    </div>
  );
}
