import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { addDays, format, parseISO } from 'date-fns';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { expenseService } from '../../services/expenseService';
import { categoryService } from '../../services/categoryService';
import { bankAccountService } from '../../services/bankAccountService';
import { extractApiError } from '../../utils/apiError';
import { todayIso } from '../../utils/date';
import type { Category } from '../../types/category';
import type { BankAccount } from '../../types/bankAccount';
import type { ExpenseType } from '../../types/expense';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function isoPlusDays(iso: string, days: number): string {
  return format(addDays(parseISO(iso), days), 'yyyy-MM-dd');
}

export function ExpenseFormModal({ open, onClose, onSaved }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);

  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [expenseType, setExpenseType] = useState<ExpenseType>('VARIABLE');
  const [installmentsCount, setInstallmentsCount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [firstDueDate, setFirstDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([categoryService.listAll(), bankAccountService.listAll()])
      .then(([c, b]) => {
        setCategories(c);
        setBanks(b);
      })
      .catch(() => {});

    setDescription('');
    setTotalAmount(null);
    setExpenseType('VARIABLE');
    setInstallmentsCount('');
    setPurchaseDate(todayIso());
    setFirstDueDate('');
    setCategoryId('');
    setBankAccountId('');
    setError(null);
  }, [open]);

  function handleTypeChange(newType: ExpenseType) {
    setExpenseType(newType);
    if (newType === 'INSTALLMENT') {
      if (!firstDueDate) {
        setFirstDueDate(isoPlusDays(purchaseDate, 30));
      }
    } else {
      setFirstDueDate('');
    }
  }

  function handlePurchaseDateChange(newDate: string) {
    setPurchaseDate(newDate);
    if (expenseType === 'INSTALLMENT' && newDate && (!firstDueDate || firstDueDate < newDate)) {
      setFirstDueDate(isoPlusDays(newDate, 30));
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!description.trim()) return setError('Descrição é obrigatória');
    const total = totalAmount ?? 0;
    if (total <= 0) return setError('Valor deve ser maior que zero');
    if (!categoryId) return setError('Selecione uma categoria');
    if (!bankAccountId) return setError('Selecione uma conta bancária');

    let count: number | null = null;
    let firstDue: string | null = null;
    if (expenseType === 'INSTALLMENT') {
      const c = Number(installmentsCount);
      if (!Number.isInteger(c) || c < 1) return setError('Número de parcelas deve ser inteiro >= 1');
      count = c;
      if (!firstDueDate) return setError('Vencimento da 1ª parcela é obrigatório');
      if (firstDueDate < purchaseDate) {
        return setError('Vencimento da 1ª parcela não pode ser anterior à data da compra');
      }
      firstDue = firstDueDate;
    }

    setSubmitting(true);
    try {
      await expenseService.create({
        description: description.trim(),
        totalAmount: total,
        expenseType,
        installmentsCount: count,
        purchaseDate,
        firstDueDate: firstDue,
        categoryId,
        bankAccountId,
      });
      toast.success('Despesa criada');
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
      title="Nova despesa"
      size="lg"
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
        <Input
          id="exp-desc"
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo"
            value={expenseType}
            onChange={(e) => handleTypeChange(e.target.value as ExpenseType)}
          >
            <option value="VARIABLE">Variável (pontual)</option>
            <option value="INSTALLMENT">Parcelada</option>
            <option value="FIXED">Fixa (mensalidade)</option>
          </Select>
          <Input
            label="Data da compra"
            type="date"
            value={purchaseDate}
            onChange={(e) => handlePurchaseDateChange(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CurrencyInput
            label={expenseType === 'INSTALLMENT' ? 'Total' : expenseType === 'FIXED' ? 'Valor mensal' : 'Valor'}
            value={totalAmount}
            onChange={setTotalAmount}
          />
          {expenseType === 'INSTALLMENT' && (
            <Input
              label="Nº de parcelas"
              type="number"
              min={1}
              value={installmentsCount}
              onChange={(e) => setInstallmentsCount(e.target.value)}
            />
          )}
        </div>
        {expenseType === 'INSTALLMENT' && (
          <div>
            <Input
              label="Vencimento da 1ª parcela"
              type="date"
              value={firstDueDate}
              min={purchaseDate}
              onChange={(e) => setFirstDueDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Quando a primeira parcela vai vencer. As demais são geradas mensalmente a partir desta data.
            </p>
          </div>
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
