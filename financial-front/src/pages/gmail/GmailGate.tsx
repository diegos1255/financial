import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { GmailConnectPage } from './GmailConnectPage';
import { GmailInboxPage } from './GmailInboxPage';
import { gmailService } from '../../services/gmailService';
import type { GmailStatus } from '../../types/gmail';

export function GmailGate() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    gmailService
      .getStatus()
      .then((s) => {
        setStatus((prev) => {
          // se estava desconectado e agora conectou, avisa quem interessar
          // (context de notificacoes reinicia o polling que foi pausado no reauth)
          if (prev && !prev.connected && s.connected) {
            window.dispatchEvent(new CustomEvent('gmail-reconnected'));
          }
          return s;
        });
      })
      .catch(() => setStatus({ connected: false, emailAddress: null }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    function onReauth() {
      toast.error('Sessão do Gmail expirou. Reconecte para continuar.', {
        id: 'gmail-reauth',
        duration: 6000,
      });
      // backend ja deletou a credential — refetch confirma e mostra o gate de conectar
      refresh();
    }
    window.addEventListener('gmail-reauth-required', onReauth);
    return () => window.removeEventListener('gmail-reauth-required', onReauth);
  }, [refresh]);

  if (loading) {
    return (
      <div>
        <p className="p-6 text-center text-sm text-slate-500">Carregando...</p>
      </div>
    );
  }

  if (!status?.connected) {
    return <GmailConnectPage />;
  }

  return <GmailInboxPage emailAddress={status.emailAddress} />;
}
