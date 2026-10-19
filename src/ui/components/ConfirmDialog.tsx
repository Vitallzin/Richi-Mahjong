/**
 * Confirmação no estilo do jogo (substitui o `confirm()` do navegador): selo com hanzi, título, texto e
 * dois botões. Esc ou clicar fora cancela; o foco começa no botão seguro (cancelar).
 */
import { useEffect, useRef } from 'react';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  readonly glyph: string;
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  /** Ação destrutiva (sair, apagar): botão de confirmar em cinábrio. */
  readonly danger?: boolean;
  /** Dentro do palco da mesa (1600×900): tudo maior para compensar a escala. */
  readonly onStage?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog({
  glyph,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onStage = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => cancel.current?.focus(), []);
  return (
    <div className={`${styles.backdrop} ${onStage ? styles.onStage : ''}`} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
      >
        <span className={danger ? styles.sealDanger : styles.seal} aria-hidden="true">
          {glyph}
        </span>
        <h2 id="confirm-title" className={styles.title}>
          {title}
        </h2>
        <p id="confirm-message" className={styles.message}>
          {message}
        </p>
        <div className={styles.buttons}>
          <button ref={cancel} type="button" className={styles.cancel} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? styles.confirmDanger : styles.confirm}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
