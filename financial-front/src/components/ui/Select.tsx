import { forwardRef } from 'react';
import type { SelectHTMLAttributes, ReactNode } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  children: ReactNode;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', id, children, ...rest }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
          {...rest}
        >
          {children}
        </select>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  },
);
Select.displayName = 'Select';
