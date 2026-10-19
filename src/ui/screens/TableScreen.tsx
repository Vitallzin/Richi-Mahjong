/** Rota /partida: retoma a sessão atual (ou a salva) e mostra a mesa. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n';
import { closeSession, currentSession, resumeSavedMatch } from '../../state/match';
import { exitGameDisplay } from '../platform/display';
import { Table } from '../table/Table';
import styles from './SimpleScreen.module.css';
import { BackLink } from '../components/BackLink';

export function TableScreen() {
  const navigate = useNavigate();
  const [session] = useState(() => currentSession() ?? resumeSavedMatch());

  if (!session) {
    return (
      <main className={styles.screen}>
        <p className={styles.body}>{t('table.noSession')}</p>
        <BackLink />
      </main>
    );
  }

  // Depuração em desenvolvimento: a sessão fica acessível no console.
  if (import.meta.env.DEV) Object.assign(globalThis, { __session: session });

  const leave = (to: string) => {
    closeSession(); // a partida em andamento continua salva (autosave)
    void exitGameDisplay();
    navigate(to);
  };

  return <Table session={session} onExit={() => leave('/')} onPlayAgain={() => leave('/jogar')} />;
}
