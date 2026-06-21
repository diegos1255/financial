import { Modal } from './Modal';
import { Button } from './Button';

type Props = {
  show: boolean;
  secondsLeft: number;
  onContinue: () => void;
};

export function IdleWarningModal({ show, secondsLeft, onContinue }: Props) {
  return (
    <Modal
      open={show}
      onClose={onContinue}
      title="Sessão prestes a expirar"
      footer={
        <Button onClick={onContinue}>Continuar logado</Button>
      }
    >
      <p className="text-sm text-slate-600">
        Sua sessão vai expirar por inatividade em{' '}
        <strong className="text-slate-900">{secondsLeft}</strong>{' '}
        segundo{secondsLeft !== 1 ? 's' : ''}.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Clique em "Continuar logado" ou realize qualquer ação para permanecer conectado.
      </p>
    </Modal>
  );
}
