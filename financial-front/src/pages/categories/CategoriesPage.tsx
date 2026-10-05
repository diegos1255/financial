import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, RotateCcw, Search, Tag, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EntityCard } from '../../components/ui/EntityCard';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { CategoryFormModal } from './CategoryFormModal';
import { categoryService } from '../../services/categoryService';
import { extractApiError } from '../../utils/apiError';
import type { Category } from '../../types/category';

export function CategoriesPage() {
  const [allItems, setAllItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);
  const [removingLoading, setRemovingLoading] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const result = await categoryService.list({ includeInactive: true, page: 0, size: 1000 });
      setAllItems(result.content);
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao carregar categorias.'));
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
      await categoryService.remove(removing.id);
      toast.success('Categoria desativada');
      setRemoving(null);
      reload();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setRemovingLoading(false);
    }
  }

  async function handleReactivate(item: Category) {
    try {
      await categoryService.setActive(item.id, true);
      toast.success('Categoria reativada');
      reload();
    } catch (err) {
      toast.error(extractApiError(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle="Tipos de despesas"
        icon={Tag}
        tone="indigo"
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-500 shadow-soft">
          Nenhuma categoria encontrada.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((r) => (
            <EntityCard
              key={r.id}
              title={r.name}
              // Muitas descricoes repetem o nome: so mostra quando acrescenta algo.
              description={r.description && r.description.trim().toLowerCase() !== r.name.trim().toLowerCase() ? r.description : null}
              color={r.color}
              inactive={!r.active}
              actions={
                r.active ? (
                  <>
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-accent transition-colors"
                      onClick={() => { setEditing(r); setFormOpen(true); }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      onClick={() => setRemoving(r)}
                      title="Desativar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    className="rounded p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
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

      <CategoryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        editing={editing}
      />
      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={handleConfirmRemove}
        title="Desativar categoria"
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
