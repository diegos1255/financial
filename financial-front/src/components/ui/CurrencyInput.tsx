import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';

type CurrencyInputProps = {
  id?: string;
  label?: string;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  autoFocus?: boolean;
};

const MAX_DIGITS = 13;

function digitsFromNumber(n: number | null): string {
  if (n == null || isNaN(n)) return '';
  const cents = Math.round(n * 100);
  if (cents <= 0) return '';
  return String(cents);
}

function formatFromDigits(digits: string): string {
  if (!digits) return '';
  const padded = digits.padStart(3, '0');
  const intRaw = padded.slice(0, -2).replace(/^0+(?=\d)/, '');
  const dec = padded.slice(-2);
  const intWithThousands = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intWithThousands},${dec}`;
}

export function CurrencyInput({
  id,
  label,
  value,
  onChange,
  disabled,
  error,
  placeholder = '0,00',
  autoFocus,
}: CurrencyInputProps) {
  const [digits, setDigits] = useState<string>(() => digitsFromNumber(value));

  useEffect(() => {
    const currentNum = digits ? parseInt(digits, 10) / 100 : 0;
    const incoming = value ?? 0;
    if (Math.abs(currentNum - incoming) >= 0.005) {
      setDigits(digitsFromNumber(value));
    }
  }, [value]);

  const display = formatFromDigits(digits);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value.replace(/\D/g, '').slice(0, MAX_DIGITS);
    setDigits(next);
    const num = next ? parseInt(next, 10) / 100 : 0;
    onChange(num);
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div
        className={`flex w-full max-w-[220px] overflow-hidden rounded-md border bg-white transition-colors focus-within:ring-1 ${
          error
            ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-400'
            : 'border-slate-300 focus-within:border-accent focus-within:ring-accent'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <span className="flex select-none items-center bg-slate-50 px-3 text-sm font-medium text-slate-500 border-r border-slate-200">
          R$
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="w-full bg-transparent px-3 py-2 text-left text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
