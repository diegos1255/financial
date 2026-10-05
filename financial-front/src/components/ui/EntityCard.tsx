import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string | null;
  /** Cor da faixa lateral (hex). */
  color?: string | null;
  icon?: ReactNode;
  inactive?: boolean;
  actions?: ReactNode;
};

/** Cartao de cadastro simples (categorias, contas) — WORK-33. */
export function EntityCard({ title, description, color, icon, inactive, actions }: Props) {
  return (
    <div
      className={`group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pl-5 shadow-soft transition-shadow hover:shadow-md ${inactive ? 'opacity-60' : ''}`}
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: color ?? '#cbd5e1' }} aria-hidden />
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium text-slate-900 ${inactive ? 'line-through' : ''}`} title={title}>
          {title}
        </p>
        {description && (
          <p className="mt-0.5 truncate text-sm text-slate-500" title={description}>
            {description}
          </p>
        )}
        {inactive && <p className="mt-1 text-xs font-medium text-red-500">Inativo</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-0.5">{actions}</div>}
    </div>
  );
}
