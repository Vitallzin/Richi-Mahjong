/**
 * Botão de navegação das telas de conteúdo: pílula dourada com seta animada. Por padrão volta ao menu;
 * com `forward`, a seta vai à direita (ex.: "Configurações").
 */
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import styles from './Button.module.css';

export function BackLink({
  to = '/',
  label,
  forward = false,
}: {
  to?: string;
  label?: string;
  forward?: boolean;
}) {
  return (
    <Link className={forward ? styles.forward : styles.back} to={to}>
      <span className={styles.backArrow} aria-hidden="true">
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={forward ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'} />
        </svg>
      </span>
      {label ?? t('common.back')}
    </Link>
  );
}
