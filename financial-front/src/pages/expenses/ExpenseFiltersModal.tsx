import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import type { Category } from '../../types/category';
import type { ExpenseType } from '../../types/expense';

export type ExpenseSort = 'PURCHASE_DATE_DESC' | 'AMOUNT_DESC' | 'AMOUNT_ASC';

export type ExpenseFilters = {
  expenseType: ExpenseType | '';
  categoryId: string;
  purchaseFrom: string;
  purchaseTo: string;
  sort: ExpenseSort;
};

export const DEFAULT_FILTERS: ExpenseFilters = {
  expenseType: '',
  categoryId: '',
  purchaseFrom: '',
  purchaseTo: '',
  sort: 'PURCHASE_DATE_DESC',
};

/** Conta quantos filtros estao "ativos" (diferente do default). */
export function countActiveFilters(f: ExpenseFilters): number {
  let n = 0;
  if (f.expenseType !== '') n++;
  if (f.categoryId !== '') n++;
  if (f.purchaseFrom !== '' || f.purchaseTo !== '') n++;
  if (f.sort !== DEFAULT_FILTERS.sort) n++;
  return n;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (filters: ExpenseFilters) => void;
  current: ExpenseFilters;
  categories: Category[];
};

export function ExpenseFiltersModal({ open, onClose, onApply, current, categories }: Props) {
  const [draft, setDraft] = useState<ExpenseFilters>(current);

  // Ao abrir, sincroniza com os filtros atuais
  useEffect(() => {
    if (open) setDraft(current);
  }, [open, current]);

  function apply() {
    onApply(draft);
    onClose();
  }

  function clearInModal() {
    setDraft(DEFAULT_FILTERS);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filtros"
      size="md"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <button
            type="button"
            onClick={clearInModal}
            className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Limpar
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={apply}>Aplicar</Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
          <Select
            value={draft.expenseType}
            onChange={(e) => setDraft({ ...draft, expenseType: e.target.value as ExpenseType | '' })}
          >
            <option value="">Todas</option>
            <option value="FIXED">Fixa</option>
            <option value="INSTALLMENT">Parcelada</option>
            <option value="VARIABLE">Variável</option>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Categoria</label>
          <Select
            value={draft.categoryId}
            onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Data da compra
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="date"
                value={draft.purchaseFrom}
                onChange={(e) => setDraft({ ...draft, purchaseFrom: e.target.value })}
                placeholder="De"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
            <span className="text-xs text-slate-400">até</span>
            <div className="flex-1">
              <input
                type="date"
                value={draft.purchaseTo}
                onChange={(e) => setDraft({ ...draft, purchaseTo: e.target.value })}
                placeholder="Até"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Ordenação</label>
          <Select
            value={draft.sort}
            onChange={(e) => setDraft({ ...draft, sort: e.target.value as ExpenseSort })}
          >
            <option value="PURCHASE_DATE_DESC">Data da compra (padrão)</option>
            <option value="AMOUNT_DESC">Maior valor</option>
            <option value="AMOUNT_ASC">Menor valor</option>
          </Select>
        </div>
      </div>
    </Modal>
  );
}
