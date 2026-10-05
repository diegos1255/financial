import type { ReactNode } from 'react';
import { Nfc } from 'lucide-react';

type Props = {
  name: string;
  description?: string | null;
  /** Nome impresso no cartao (ex.: "DIEGO S OLIVEIRA"). */
  holderName: string;
  inactive?: boolean;
  actions?: ReactNode;
};

const NUBANK_PURPLE = '#820ad1';

function Chip({ silver }: { silver?: boolean }) {
  return (
    <span
      className={`relative block h-9 w-12 overflow-hidden rounded-md shadow-inner ${
        silver ? 'bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400' : 'bg-gradient-to-br from-amber-200 to-amber-400'
      }`}
      aria-hidden
    >
      <span className="absolute inset-x-0 top-1/3 h-px bg-slate-500/40" />
      <span className="absolute inset-x-0 top-2/3 h-px bg-slate-500/40" />
      <span className="absolute inset-y-0 left-1/3 w-px bg-slate-500/40" />
      <span className="absolute inset-y-0 left-2/3 w-px bg-slate-500/40" />
    </span>
  );
}

// Visual do Nubank "cromado" (champanhe metalico) — so para contas com "Nubank" no nome.
function NubankCard({ holderName, inactive, actions }: Pick<Props, 'holderName' | 'inactive' | 'actions'>) {
  return (
    <>
      <span
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #ddd6c8 0%, #c9c0ad 45%, #d8d1c3 70%, #bfb5a1 100%)' }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.7) 45%, transparent 60%)' }}
        aria-hidden
      />

      <div className="relative flex items-start justify-between">
        <span
          className="select-none text-5xl font-bold leading-none tracking-tighter"
          style={{ color: NUBANK_PURPLE }}
          aria-label="nu"
        >
          nu
        </span>
        {/* bandeira: dois circulos sobrepostos */}
        <span className="relative mt-1 flex" aria-hidden>
          <span className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-red-600" />
          <span className="-ml-4 h-10 w-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 opacity-90" />
        </span>
      </div>

      <div className="relative flex justify-end pr-6">
        <Chip silver />
      </div>

      <div className="relative flex items-end justify-between gap-2">
        <p
          className={`truncate text-lg font-semibold tracking-wide ${inactive ? 'line-through' : ''}`}
          style={{ color: NUBANK_PURPLE }}
        >
          {holderName}
        </p>
        <div className="flex shrink-0 items-center gap-0.5 text-slate-600">{actions}</div>
      </div>
    </>
  );
}

function GenericCard({ name, description, inactive, actions }: Omit<Props, 'holderName'>) {
  return (
    <>
      <span
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600"
        aria-hidden
      />
      <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" aria-hidden />
      <span className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/5" aria-hidden />

      <div className="relative flex items-start justify-between text-white">
        <Chip />
        <div className="flex items-center gap-1">
          <Nfc className="mr-1 h-5 w-5 text-white/70" aria-hidden />
          {actions}
        </div>
      </div>

      <div className="relative text-white">
        <p className={`truncate text-2xl font-semibold tracking-wide ${inactive ? 'line-through' : ''}`} title={name}>
          {name}
        </p>
        {description && (
          <p className="mt-1 truncate text-sm text-white/80" title={description}>
            {description}
          </p>
        )}
      </div>
    </>
  );
}

/** Conta bancaria no formato de cartao de banco (WORK-33): normalmente ha uma conta so, entao ela e a peca principal da tela. */
export function BankCard({ name, description, holderName, inactive, actions }: Props) {
  const isNubank = /nubank/i.test(name);
  return (
    <div
      className={`relative flex aspect-[1.586] w-full flex-col justify-between overflow-hidden rounded-2xl p-6 shadow-lg transition-transform hover:-translate-y-0.5 ${inactive ? 'opacity-60 grayscale' : ''}`}
      title={description ? `${name} — ${description}` : name}
    >
      {isNubank ? (
        <NubankCard holderName={holderName} inactive={inactive} actions={actions} />
      ) : (
        <GenericCard name={name} description={description} inactive={inactive} actions={actions} />
      )}
      {inactive && (
        <span className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
          Inativa
        </span>
      )}
    </div>
  );
}
