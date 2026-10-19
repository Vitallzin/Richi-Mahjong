/** Primeiro login com preferências locais: "Levar suas configurações atuais para a conta?" (12.3). */
import { t } from '../../i18n';
import { answerMigration, useAccount } from '../../state/account';
import { ConfirmDialog } from './ConfirmDialog';

export function MigrationPrompt() {
  const ask = useAccount((s) => s.askMigration);
  if (!ask) return null;
  return (
    <ConfirmDialog
      glyph="移"
      title={t('account.migrate.title')}
      message={t('account.migrate.message')}
      confirmLabel={t('account.migrate.yes')}
      cancelLabel={t('account.migrate.no')}
      onConfirm={() => void answerMigration(true)}
      onCancel={() => void answerMigration(false)}
    />
  );
}
