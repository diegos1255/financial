import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, BellOff, Pencil, PenSquare, Plus, RefreshCw, Tag, Trash2, Volume2, VolumeX } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { ThreadListItem } from './components/ThreadListItem';
import { ThreadViewer } from './components/ThreadViewer';
import { SelectionToolbar } from './components/SelectionToolbar';
import { LabelFormModal } from './components/LabelFormModal';
import { GmailComposerModal } from './components/GmailComposerModal';
import { gmailService } from '../../services/gmailService';
import { extractApiError } from '../../utils/apiError';
import { useGmailNotifications } from '../../contexts/GmailNotificationsContext';
import {
  CATEGORY_LABELS,
  type GmailBulkAction,
  type GmailCategory,
  type LabelSummary,
  type ThreadDetail,
  type ThreadSummary,
} from '../../types/gmail';

type ViewSource =
  | { kind: 'category'; value: GmailCategory }
  | { kind: 'label'; value: string; name: string };

type ListState = {
  threads: ThreadSummary[];
  nextPageToken: string | null;
  loaded: boolean;
};

const CATEGORIES: GmailCategory[] = ['PRIMARY', 'SOCIAL', 'PROMOTIONS', 'UPDATES'];

function keyOf(view: ViewSource): string {
  return view.kind === 'category' ? `cat:${view.value}` : `label:${view.value}`;
}

export function GmailInboxPage({ emailAddress }: { emailAddress: string | null }) {
  const [view, setView] = useState<ViewSource>({ kind: 'category', value: 'PRIMARY' });
  const [cache, setCache] = useState<Record<string, ListState>>({});
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmTrash, setConfirmTrash] = useState<{ mode: 'single'; id: string } | { mode: 'bulk' } | null>(null);
  const [labels, setLabels] = useState<LabelSummary[]>([]);
  const [labelModal, setLabelModal] = useState<{ open: boolean; editing: LabelSummary | null }>({
    open: false,
    editing: null,
  });
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<LabelSummary | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const { refreshTick, voiceEnabled, setVoiceEnabled } = useGmailNotifications();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );

  const viewKey = keyOf(view);
  const current: ListState = cache[viewKey] ?? { threads: [], nextPageToken: null, loaded: false };

  async function requestNotificationPermission() {
    if (typeof Notification === 'undefined') {
      toast.error('Este browser não suporta notificações');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') toast.success('Notificações do sistema ativadas');
    else toast.error('Permissão de notificação negada');
  }

  function toggleVoice() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    toast.success(next ? 'Voz ativada' : 'Voz desativada', { duration: 2000 });
  }

  async function loadLabels() {
    try {
      const list = await gmailService.listLabels(false);
      setLabels(list);
    } catch {
      // silencia
    }
  }

  useEffect(() => {
    loadLabels();
  }, []);

  async function loadView(target: ViewSource, append = false) {
    const key = keyOf(target);
    const state = cache[key];
    if (append && !state?.nextPageToken) return;
    if (append) setLoadingMore(true);
    else setLoadingList(true);
    try {
      const page = target.kind === 'category'
        ? await gmailService.listThreads(target.value, append ? state?.nextPageToken ?? undefined : undefined)
        : await gmailService.listThreadsByLabel(target.value, append ? state?.nextPageToken ?? undefined : undefined);

      setCache((prev) => {
        const existing = prev[key] ?? { threads: [], nextPageToken: null, loaded: false };
        return {
          ...prev,
          [key]: {
            threads: append ? [...existing.threads, ...page.items] : page.items,
            nextPageToken: page.nextPageToken,
            loaded: true,
          },
        };
      });
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao listar emails.'));
    } finally {
      setLoadingList(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!cache[viewKey]?.loaded) loadView(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  useEffect(() => {
    if (refreshTick === 0) return;
    loadView(view);
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
          [viewKey]: {
            ...(prev[viewKey] ?? { threads: [], nextPageToken: null, loaded: false }),
            threads: (prev[viewKey]?.threads ?? []).map((t) =>
              t.id === thread.id ? { ...t, unread: false } : t,
            ),
          } as ListState,
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
    setSelectedIds(new Set());
    setCache((prev) => ({
      ...prev,
      [viewKey]: { threads: [], nextPageToken: null, loaded: false },
    }));
    loadView(view);
  }

  function toggleCheck(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function removeFromCurrentCache(ids: string[]) {
    const idsSet = new Set(ids);
    setCache((prev) => ({
      ...prev,
      [viewKey]: {
        ...(prev[viewKey] ?? { threads: [], nextPageToken: null, loaded: false }),
        threads: (prev[viewKey]?.threads ?? []).filter((t) => !idsSet.has(t.id)),
      } as ListState,
    }));
  }

  function markUnreadInCache(ids: string[]) {
    const idsSet = new Set(ids);
    setCache((prev) => ({
      ...prev,
      [viewKey]: {
        ...(prev[viewKey] ?? { threads: [], nextPageToken: null, loaded: false }),
        threads: (prev[viewKey]?.threads ?? []).map((t) =>
          idsSet.has(t.id) ? { ...t, unread: true } : t,
        ),
      } as ListState,
    }));
  }

  async function doSingleAction(action: 'trash' | 'unread', id: string) {
    setActionLoading(true);
    try {
      if (action === 'trash') await gmailService.trashThread(id);
      else await gmailService.markThreadAsUnread(id);

      if (action === 'unread') markUnreadInCache([id]);
      else removeFromCurrentCache([id]);
      if (selectedThread?.id === id) setSelectedThread(null);
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
      toast.success(action === 'trash' ? 'Movido para lixeira' : 'Marcado como não-lido');
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao executar ação.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function doBulkAction(action: GmailBulkAction) {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setActionLoading(true);
    try {
      const result = await gmailService.bulkAction(action, ids);
      if (action === 'UNREAD') markUnreadInCache(ids.filter((id) => !result.failedIds.includes(id)));
      else removeFromCurrentCache(ids.filter((id) => !result.failedIds.includes(id)));
      if (selectedThread && ids.includes(selectedThread.id)) setSelectedThread(null);
      clearSelection();

      const label =
        action === 'ARCHIVE' ? 'arquivada(s)'
          : action === 'TRASH' ? 'movida(s) para lixeira'
            : action === 'UNREAD' ? 'marcada(s) como não-lida(s)'
              : 'processada(s)';
      const msg = result.failedIds.length === 0
        ? `${result.successCount} conversa(s) ${label}`
        : `${result.successCount} conversa(s) ${label}, ${result.failedIds.length} falha(s)`;
      if (result.failedIds.length === 0) toast.success(msg);
      else toast.error(msg);
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao executar ação em lote.'));
    } finally {
      setActionLoading(false);
    }
  }

  function handleTrashClick(id: string) { setConfirmTrash({ mode: 'single', id }); }
  function handleBulkTrash() { setConfirmTrash({ mode: 'bulk' }); }

  async function confirmTrashAction() {
    if (!confirmTrash) return;
    if (confirmTrash.mode === 'single') await doSingleAction('trash', confirmTrash.id);
    else await doBulkAction('TRASH');
    setConfirmTrash(null);
  }

  function invalidateLabelCaches(labelIds: string[]) {
    if (labelIds.length === 0) return;
    setCache((prev) => {
      const next = { ...prev };
      for (const id of labelIds) {
        delete next[`label:${id}`];
      }
      return next;
    });
  }

  async function handleApplyLabels(add: string[], remove: string[]) {
    if (!selectedThread) return;
    if (add.length === 0 && remove.length === 0) return;
    setActionLoading(true);
    try {
      await gmailService.modifyThreadLabels(selectedThread.id, add, remove);
      // atualiza labelIds em todas as mensagens da thread aberta
      setSelectedThread((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) => {
            const set = new Set(m.labelIds);
            add.forEach((id) => set.add(id));
            remove.forEach((id) => set.delete(id));
            return { ...m, labelIds: Array.from(set) };
          }),
        };
      });
      // invalida cache das labels afetadas para forcar refetch no proximo clique
      invalidateLabelCaches([...add, ...remove]);
      toast.success('Labels aplicadas');
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao aplicar labels.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBulkApplyLabels(add: string[], remove: string[]) {
    if (selectedIds.size === 0) return;
    if (add.length === 0 && remove.length === 0) return;
    const ids = Array.from(selectedIds);
    setActionLoading(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => gmailService.modifyThreadLabels(id, add, remove)),
      );
      const failedCount = results.filter((r) => r.status === 'rejected').length;
      const successCount = results.length - failedCount;

      invalidateLabelCaches([...add, ...remove]);
      clearSelection();

      const msg = failedCount === 0
        ? `${successCount} conversa(s) etiquetada(s)`
        : `${successCount} conversa(s) etiquetada(s), ${failedCount} falha(s)`;
      if (failedCount === 0) toast.success(msg);
      else toast.error(msg);
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao aplicar labels em lote.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteLabel() {
    if (!confirmDeleteLabel) return;
    setActionLoading(true);
    try {
      await gmailService.deleteLabel(confirmDeleteLabel.id);
      toast.success('Label removida');
      // se estava vendo essa label, volta pra Principal
      if (view.kind === 'label' && view.value === confirmDeleteLabel.id) {
        setView({ kind: 'category', value: 'PRIMARY' });
      }
      setConfirmDeleteLabel(null);
      loadLabels();
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao remover label.'));
    } finally {
      setActionLoading(false);
    }
  }

  function switchTo(target: ViewSource) {
    if (keyOf(target) === viewKey) return;
    setView(target);
    setSelectedThread(null);
    clearSelection();
  }

  const userLabels = labels
    .filter((l) => l.type === 'user')
    .sort((a, b) => a.name.localeCompare(b.name));

  const currentTitle = view.kind === 'category'
    ? CATEGORY_LABELS[view.value]
    : view.name;

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
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
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
            <Button onClick={() => setComposerOpen(true)}>
              <PenSquare className="h-4 w-4" />
              Novo email
            </Button>
            <Button variant="ghost" onClick={handleRefresh} disabled={loadingList}>
              <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,220px)_minmax(0,380px)_1fr] gap-4">
        {/* Sidebar de views (categorias + labels) */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-soft p-3 flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Categorias</p>
            <ul className="flex flex-col gap-0.5">
              {CATEGORIES.map((cat) => {
                const active = view.kind === 'category' && view.value === cat;
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => switchTo({ kind: 'category', value: cat })}
                      className={[
                        'w-full text-left rounded-md px-3 py-1.5 text-sm transition-colors',
                        active ? 'bg-accent-soft text-accent font-medium' : 'text-slate-600 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Labels</p>
              <button
                type="button"
                onClick={() => setLabelModal({ open: true, editing: null })}
                title="Nova label"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-accent transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {userLabels.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400">Nenhuma label custom.</p>
            )}
            <ul className="flex flex-col gap-0.5">
              {userLabels.map((l) => {
                const active = view.kind === 'label' && view.value === l.id;
                return (
                  <li key={l.id} className="group flex items-center">
                    <button
                      type="button"
                      onClick={() => switchTo({ kind: 'label', value: l.id, name: l.name })}
                      className={[
                        'flex-1 text-left rounded-md px-3 py-1.5 text-sm truncate transition-colors flex items-center gap-2',
                        active ? 'bg-accent-soft text-accent font-medium' : 'text-slate-600 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <Tag className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{l.name}</span>
                    </button>
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setLabelModal({ open: true, editing: l })}
                        title="Renomear"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-accent"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteLabel(l)}
                        title="Excluir"
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Lista de threads */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700 truncate">{currentTitle}</h3>
          </div>

          <SelectionToolbar
            selectedCount={selectedIds.size}
            labels={labels}
            loading={actionLoading}
            onMarkUnread={() => doBulkAction('UNREAD')}
            onTrash={handleBulkTrash}
            onApplyLabels={handleBulkApplyLabels}
            onClear={clearSelection}
          />

          <div className="rounded-xl border border-slate-200 bg-white shadow-soft overflow-hidden max-h-[70vh] overflow-y-auto">
            {loadingList && !current.loaded && (
              <p className="p-6 text-center text-sm text-slate-500">Carregando...</p>
            )}
            {current.loaded && current.threads.length === 0 && (
              <p className="p-6 text-center text-sm text-slate-500">Nenhum email aqui.</p>
            )}
            {current.threads.map((t) => (
              <ThreadListItem
                key={t.id}
                thread={t}
                selected={selectedThread?.id === t.id}
                checked={selectedIds.has(t.id)}
                onClick={() => handleThreadClick(t)}
                onToggleCheck={() => toggleCheck(t.id)}
              />
            ))}
            {current.nextPageToken && (
              <button
                type="button"
                onClick={() => loadView(view, true)}
                disabled={loadingMore}
                className="w-full py-3 text-sm text-accent hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            )}
          </div>
        </div>

        {/* Painel de leitura */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-[70vh] overflow-y-auto">
          {loadingThread && (
            <p className="p-6 text-center text-sm text-slate-500">Carregando conversa...</p>
          )}
          {!loadingThread && !selectedThread && (
            <p className="p-6 text-center text-sm text-slate-500">Selecione uma conversa pra ler.</p>
          )}
          {selectedThread && (
            <ThreadViewer
              thread={selectedThread}
              labels={labels}
              loading={actionLoading}
              onMarkUnread={() => doSingleAction('unread', selectedThread.id)}
              onTrash={() => handleTrashClick(selectedThread.id)}
              onApplyLabels={handleApplyLabels}
            />
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmTrash}
        onClose={() => setConfirmTrash(null)}
        onConfirm={confirmTrashAction}
        title="Mover para lixeira"
        message={
          confirmTrash?.mode === 'bulk'
            ? `Mover ${selectedIds.size} conversa(s) para lixeira?`
            : 'Mover esta conversa para lixeira?'
        }
        confirmLabel="Mover"
        cancelLabel="Cancelar"
        loading={actionLoading}
      />

      <ConfirmModal
        open={!!confirmDeleteLabel}
        onClose={() => setConfirmDeleteLabel(null)}
        onConfirm={handleDeleteLabel}
        title="Excluir label"
        message={
          confirmDeleteLabel && (
            <>
              Excluir label <strong>{confirmDeleteLabel.name}</strong>? As mensagens que tinham
              essa label não são apagadas — só perdem a marcação.
            </>
          )
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        loading={actionLoading}
      />

      <LabelFormModal
        open={labelModal.open}
        editing={labelModal.editing}
        onClose={() => setLabelModal({ open: false, editing: null })}
        onSaved={loadLabels}
      />

      <GmailComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
      />
    </div>
  );
}
