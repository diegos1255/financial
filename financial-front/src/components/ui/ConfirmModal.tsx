import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={() => onConfirm()} disabled={loading}>
            {loading ? 'Aguarde...' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-700">{message}</div>
    </Modal>
  );
}
