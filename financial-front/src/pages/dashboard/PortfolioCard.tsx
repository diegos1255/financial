import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import type { InvestmentPortfolioResponse } from '../../types/investment';

type Props = {
  portfolio: InvestmentPortfolioResponse;
};

export function PortfolioCard({ portfolio }: Props) {
  const fetchedAt = new Date(portfolio.fetchedAt);
  const diffHours = Math.round((Date.now() - fetchedAt.getTime()) / 3600000);
  const ageLabel = diffHours < 1 ? 'há menos de 1 hora' : `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-slate-400" />
          <h2 className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Portfólio</h2>
        </div>
        <span className="text-lg font-semibold text-slate-900 tabular-nums">
          {formatCurrency(portfolio.totalMarketValue)}
        </span>
      </div>
      <div className="-mx-5 border-t border-slate-100 mb-4" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-400 uppercase tracking-wide">
            <th className="text-left pb-2 font-medium">Ticker</th>
            <th className="text-right pb-2 font-medium">Cotas</th>
            <th className="text-right pb-2 font-medium">Preço atual</th>
            <th className="text-right pb-2 font-medium">Var. dia</th>
            <th className="text-right pb-2 font-medium">Val. mercado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {portfolio.items.map((item) => (
            <tr key={item.id}>
              <td className="py-2 font-medium text-slate-800">{item.ticker}</td>
              <td className="py-2 text-right tabular-nums text-slate-600">{item.quantity}</td>
              <td className="py-2 text-right tabular-nums text-slate-800">
                {item.priceUnavailable ? <span className="text-slate-400">—</span> : formatCurrency(item.currentPrice!)}
              </td>
              <td className="py-2 text-right tabular-nums font-medium">
                {item.priceUnavailable || item.changePercent == null ? (
                  <span className="text-slate-400">—</span>
                ) : (
                  <span className={item.changePercent >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                    {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </span>
                )}
              </td>
              <td className="py-2 text-right tabular-nums font-medium text-slate-800">
                {item.priceUnavailable ? <span className="text-slate-400">—</span> : formatCurrency(item.marketValue!)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-slate-400">⚠ Cotações atualizadas {ageLabel}</p>
    </div>
  );
}
