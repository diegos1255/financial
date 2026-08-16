import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, BellOff, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ThreadListItem } from './components/ThreadListItem';
import { ThreadViewer } from './components/ThreadViewer';
import { gmailService } from '../../services/gmailService';
import { extractApiError } from '../../utils/apiError';
import { useGmailNotifications } from '../../contexts/GmailNotificationsContext';
import {
  CATEGORY_LABELS,
  type GmailCategory,
  type ThreadDetail,
  type ThreadSummary,
} from '../../types/gmail';

type CategoryCache = {
  threads: ThreadSummary[];
  nextPageToken: string | null;
  loaded: boolean;
};

const CATEGORIES: GmailCategory[] = ['PRIMARY', 'SOCIAL', 'PROMOTIONS', 'UPDATES'];

export function GmailInboxPage({ emailAddress }: { emailAddress: string | null }) {
  const [activeCategory, setActiveCategory] = useState<GmailCategory>('PRIMARY');
  const [cache, setCache] = useState<Record<GmailCategory, CategoryCache>>({
    PRIMARY: { threads: [], nextPageToken: null, loaded: false },
    SOCIAL: { threads: [], nextPageToken: null, loaded: false },
    PROMOTIONS: { threads: [], nextPageToken: null, loaded: false },
    UPDATES: { threads: [], nextPageToken: null, loaded: false },
  });
  const [loadingCategory, setLoadingCategory] = useState<GmailCategory | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const { refreshTick, voiceEnabled, setVoiceEnabled } = useGmailNotifications();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );

  async function requestNotificationPermission() {
    if (typeof Notification === 'undefined') {
      toast.error('Este browser não suporta notificações');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      toast.success('Notificações do sistema ativadas');
    } else {
      toast.error('Permissão de notificação negada');
    }
  }

  function toggleVoice() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    toast.success(next ? 'Voz ativada' : 'Voz desativada', { duration: 2000 });
  }

  async function loadCategory(category: GmailCategory, append = false) {
    const state = cache[category];
    if (append && !state.nextPageToken) return;
    if (append) setLoadingMore(true);
    else setLoadingCategory(category);
    try {
      const page = await gmailService.listThreads(
        category,
        append ? state.nextPageToken ?? undefined : undefined,
      );
      setCache((prev) => ({
        ...prev,
        [category]: {
          threads: append ? [...prev[category].threads, ...page.items] : page.items,
          nextPageToken: page.nextPageToken,
          loaded: true,
        },
      }));
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao listar emails.'));
    } finally {
      setLoadingCategory(null);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!cache[activeCategory].loaded && loadingCategory !== activeCategory) {
      loadCategory(activeCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  // Reage a novo email detectado pelo polling do context: refetch categoria atual
  useEffect(() => {
    if (refreshTick === 0) return;
    loadCategory(activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  async function handleThreadClick(thread: ThreadSummary) {
    setLoadingThread(true);
    setSelectedThread(null);
    try {
      const detail = await gmailService.getThread(thread.id);
      setSelectedThread(detail);
      if (thread.unread) {
        gmailService.markThreadAsRead(thread.id).catch(() => {});
        setCache((prev) => ({
          ...prev,
          [activeCategory]: {
            ...prev[activeCategory],
            threads: prev[activeCategory].threads.map((t) =>
              t.id === thread.id ? { ...t, unread: false } : t,
            ),
          },
        }));
      }
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao carregar email.'));
    } finally {
      setLoadingThread(false);
    }
  }

  function handleRefresh() {
    setSelectedThread(null);
    setCache((prev) => ({
      ...prev,
      [activeCategory]: { threads: [], nextPageToken: null, loaded: false },
    }));
    loadCategory(activeCategory);
  }

  const current = cache[activeCategory];

  return (
    <div>
      <PageHeader
        title="Email"
        subtitle={emailAddress ? `Conectado como ${emailAddress}` : 'Gmail'}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleVoice}
              title={voiceEnabled ? 'Desativar voz' : 'Ativar voz'}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-accent transition-colors"
            >
              {voiceEnabled
                ? <Volume2 className="h-4 w-4" />
                : <VolumeX className="h-4 w-4" />}
            </button>
            {notifPerm !== 'granted' && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                title="Ativar notificações do Windows"
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-accent transition-colors"
              >
                <BellOff className="h-4 w-4" />
              </button>
            )}
            {notifPerm === 'granted' && (
              <span title="Notificações do Windows ativas" className="rounded p-1.5 text-emerald-600">
                <Bell className="h-4 w-4" />
              </span>
            )}
            <Button variant="ghost" onClick={handleRefresh} disabled={loadingCategory !== null}>
              <RefreshCw className={`h-4 w-4 ${loadingCategory === activeCategory ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeCategory === cat
                ? 'bg-accent-soft text-accent'
                : 'text-slate-600 hover:bg-slate-100',
            ].join(' ')}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-soft overflow-hidden max-h-[70vh] overflow-y-auto">
          {loadingCategory === activeCategory && !current.loaded && (
            <p className="p-6 text-center text-sm text-slate-500">Carregando...</p>
          )}
          {current.loaded && current.threads.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">
              Nenhum email nesta categoria.
            </p>
          )}
          {current.threads.map((t) => (
            <ThreadListItem
              key={t.id}
              thread={t}
              selected={selectedThread?.id === t.id}
              onClick={() => handleThreadClick(t)}
            />
          ))}
          {current.nextPageToken && (
            <button
              type="button"
              onClick={() => loadCategory(activeCategory, true)}
              disabled={loadingMore}
              className="w-full py-3 text-sm text-accent hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingMore ? 'Carregando...' : 'Carregar mais'}
            </button>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-[70vh] overflow-y-auto">
          {loadingThread && (
            <p className="p-6 text-center text-sm text-slate-500">Carregando conversa...</p>
          )}
          {!loadingThread && !selectedThread && (
            <p className="p-6 text-center text-sm text-slate-500">
              Selecione uma conversa pra ler.
            </p>
          )}
          {selectedThread && <ThreadViewer thread={selectedThread} />}
        </div>
      </div>
    </div>
  );
}
