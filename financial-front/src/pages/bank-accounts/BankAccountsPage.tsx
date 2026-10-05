import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { BankCard } from './BankCard';
import { cardHolderName } from '../../utils/cardHolderName';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { BankAccountFormModal } from './BankAccountFormModal';
import { bankAccountService } from '../../services/bankAccountService';
import { extractApiError } from '../../utils/apiError';
import type { BankAccount } from '../../types/bankAccount';

export function BankAccountsPage() {
  const { user } = useAuth();
  const [allItems, setAllItems] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [removing, setRemoving] = useState<BankAccount | null>(null);
  const [removingLoading, setRemovingLoading] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const result = await bankAccountService.list({ includeInactive: true, page: 0, size: 1000 });
      setAllItems(result.content);
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao carregar contas.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const lower = q.trim().toLowerCase();
    return allItems.filter((item) => {
      if (!includeInactive && !item.active) return false;
      if (lower) return item.name.toLowerCase().includes(lower);
      return true;
    });
  }, [allItems, q, includeInactive]);



  async function handleConfirmRemove() {
    if (!removing) return;
    setRemovingLoading(true);
    try {
      await bankAccountService.remove(removing.id);
      toast.success('Conta desativada');
      setRemoving(null);
      reload();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setRemovingLoading(false);
    }
  }

  async function handleReactivate(item: BankAccount) {
    try {
      await bankAccountService.setActive(item.id, true);
      toast.success('Conta reativada');
      reload();
    } catch (err) {
      toast.error(extractApiError(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Contas Bancárias"
        subtitle="Contas onde entram e saem os valores"
        icon={CreditCard}
        tone="blue"
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nova
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-slate-300 text-accent focus:ring-accent"
          />
          Mostrar inativos
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fill,minmax(320px,380px))]">
          <div className="aspect-[1.586] animate-pulse rounded-2xl bg-slate-200" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-500 shadow-soft">
          Nenhuma conta cadastrada.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fill,minmax(320px,380px))]">
          {filtered.map((r) => (
            <BankCard
              key={r.id}
              name={r.name}
              description={r.description}
              holderName={cardHolderName(user?.name ?? '')}
              inactive={!r.active}
              actions={
                r.active ? (
                  <>
                    <button
                      className="rounded-md p-1.5 opacity-80 hover:bg-black/10 hover:opacity-100 transition"
                      onClick={() => { setEditing(r); setFormOpen(true); }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-md p-1.5 opacity-80 hover:bg-black/10 hover:opacity-100 transition"
                      onClick={() => setRemoving(r)}
                      title="Desativar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    className="rounded-md p-1.5 opacity-80 hover:bg-black/10 hover:opacity-100 transition"
                    onClick={() => handleReactivate(r)}
                    title="Reativar"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )
              }
            />
          ))}
        </div>
      )}

      <BankAccountFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        editing={editing}
      />
      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={handleConfirmRemove}
        title="Desativar conta"
        message={
          <>
            Desativar <strong>{removing?.name}</strong>? Ela não aparecerá nos formulários, mas pode ser reativada depois.
          </>
        }
        confirmLabel="Desativar"
        loading={removingLoading}
      />
    </div>
  );
}
