import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { expenseService } from '../../services/expenseService';
import { categoryService } from '../../services/categoryService';
import { bankAccountService } from '../../services/bankAccountService';
import { extractApiError } from '../../utils/apiError';
import type { Category } from '../../types/category';
import type { BankAccount } from '../../types/bankAccount';
import type { Expense } from '../../types/expense';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Expense | null;
};

export function ExpenseUpdateModal({ open, onClose, onSaved, editing }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInstallment = editing?.expenseType === 'INSTALLMENT';

  useEffect(() => {
    if (!open || !editing) return;
    Promise.all([categoryService.listAll(), bankAccountService.listAll()])
      .then(([c, b]) => {
        setCategories(c);
        setBanks(b);
      })
      .catch(() => {});
    setDescription(editing.description);
    setCategoryId(editing.category.id);
    setBankAccountId(editing.bankAccount.id);
    setTotalAmount(editing.totalAmount);
    setError(null);
  }, [open, editing]);

  async function handleSubmit() {
    if (!editing) return;
    setError(null);
    if (!description.trim()) return setError('Descrição é obrigatória');
    if (!categoryId) return setError('Selecione uma categoria');
    if (!bankAccountId) return setError('Selecione uma conta');
    if (!isInstallment && (totalAmount == null || totalAmount <= 0)) {
      return setError('Valor deve ser maior que zero');
    }
    setSubmitting(true);
    try {
      await expenseService.update(editing.id, {
        description: description.trim(),
        categoryId,
        bankAccountId,
        ...(isInstallment ? {} : { totalAmount: totalAmount ?? 0 }),
      });
      toast.success('Despesa atualizada');
      onSaved();
      onClose();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title="Editar despesa"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-slate-500">
          {isInstallment
            ? 'Apenas descrição, categoria e conta podem ser editadas. Para mudar valor ou parcelas, cancele e crie uma nova.'
            : 'Você pode editar descrição, valor, categoria e conta. Para mudar o tipo, cancele e crie uma nova.'}
        </p>
        <Input
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
        {!isInstallment && (
          <CurrencyInput
            label="Valor"
            value={totalAmount}
            onChange={setTotalAmount}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Conta bancária"
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
