import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, LogOut } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { gmailService } from '../../services/gmailService';
import { extractApiError } from '../../utils/apiError';
import type { GmailStatus } from '../../types/gmail';

export function GmailConnectPage() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  async function refresh() {
    try {
      const s = await gmailService.getStatus();
      setStatus(s);
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao consultar Gmail.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (searchParams.get('connected') === '1') {
      toast.success('Gmail conectado com sucesso');
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('error') === '1') {
      toast.error('Falha ao conectar Gmail. Tente novamente.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const { authUrl } = await gmailService.getAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      setConnecting(false);
      toast.error(extractApiError(err, 'Falha ao iniciar conexão com Gmail.'));
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await gmailService.disconnect();
      toast.success('Gmail desconectado');
      setConfirmDisconnect(false);
      await refresh();
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao desconectar Gmail.'));
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Email"
        subtitle="Integração com Gmail"
      />

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-soft">
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      ) : status?.connected ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-50 p-2">
              <Mail className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Conectado como</p>
              <p className="text-base font-semibold text-slate-900">{status.emailAddress}</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Nas próximas fases, esta tela vai listar seus emails com filtros por categoria.
          </p>
          <div>
            <Button variant="ghost" onClick={() => setConfirmDisconnect(true)}>
              <LogOut className="h-4 w-4" />
              Desconectar Gmail
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-soft flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-accent-soft p-4">
            <Mail className="h-8 w-8 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Conecte sua conta Gmail</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md">
              Autorize o sistema a ler e organizar seus emails via Gmail API. Nenhum dado é
              armazenado permanentemente — os emails ficam no Gmail.
            </p>
          </div>
          <Button onClick={handleConnect} disabled={connecting}>
            <Mail className="h-4 w-4" />
            {connecting ? 'Redirecionando...' : 'Conectar Gmail'}
          </Button>
        </div>
      )}

      <ConfirmModal
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={handleDisconnect}
        title="Desconectar Gmail"
        message="Ao desconectar, o sistema perde acesso à sua caixa de emails. Você pode reconectar quando quiser."
        confirmLabel="Desconectar"
        cancelLabel="Cancelar"
        loading={disconnecting}
      />
    </div>
  );
}
