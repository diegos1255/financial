import { useEffect, useState } from 'react';
import { GmailConnectPage } from './GmailConnectPage';
import { GmailInboxPage } from './GmailInboxPage';
import { gmailService } from '../../services/gmailService';
import type { GmailStatus } from '../../types/gmail';

export function GmailGate() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gmailService
      .getStatus()
      .then((s) => setStatus(s))
      .catch(() => setStatus({ connected: false, emailAddress: null }))
      .finally(() => setLoading(false));
  }, []);

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
