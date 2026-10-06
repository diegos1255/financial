export type Investment = {
  id: string;
  ticker: string;
  quantity: number;
  description: string | null;
  active: boolean;
  createdDate: string;
  updatedDate: string;
};

export type InvestmentRequest = {
  ticker: string;
  quantity: number;
  description?: string | null;
};

export type InvestmentPortfolioItem = {
  id: string;
  ticker: string;
  quantity: number;
  currentPrice: number | null;
  changePercent: number | null;
  marketValue: number | null;
  priceUnavailable: boolean;
};

export type InvestmentPortfolioResponse = {
  items: InvestmentPortfolioItem[];
  totalMarketValue: number;
  fetchedAt: string;
};

// ---- WORK-36: movimentacoes, proventos e historico ----

export type InvestmentTransactionType = 'INITIAL' | 'BUY' | 'SELL';
export type InvestmentIncomeType = 'RENDIMENTO' | 'DIVIDENDO' | 'JCP' | 'OUTRO';
export type InvestmentDataSource = 'MANUAL' | 'B3_IMPORT';

export type InvestmentTransaction = {
  id: string;
  investmentId: string;
  type: InvestmentTransactionType;
  tradeDate: string;
  quantity: number;
  unitPrice: number | null;
  total: number | null;
  source: InvestmentDataSource;
};

export type InvestmentTransactionRequest = {
  type: 'BUY' | 'SELL';
  tradeDate: string;
  quantity: number;
  unitPrice: number | null;
};

export type InvestmentIncome = {
  id: string;
  investmentId: string;
  type: InvestmentIncomeType;
  paymentDate: string;
  quantity: number | null;
  unitValue: number | null;
  amount: number;
  source: InvestmentDataSource;
};

/** Informe `amount` (total) ou `unitValue` (por cota: o backend multiplica pelas cotas atuais). */
export type InvestmentIncomeRequest = {
  type: InvestmentIncomeType;
  paymentDate: string;
  amount?: number;
  unitValue?: number;
};

export const INCOME_TYPE_LABELS: Record<InvestmentIncomeType, string> = {
  RENDIMENTO: 'Rendimento',
  DIVIDENDO: 'Dividendo',
  JCP: 'JCP',
  OUTRO: 'Outro',
};

export type PortfolioHistory = {
  currentValue: number;
  changeThisMonth: number;
  changeThisMonthPercent: number | null;
  incomeLast90Days: number;
  months: Array<{
    year: number;
    month: number;
    marketValue: number;
    /** Ja pago. */
    income: number;
    /** A receber (data de pagamento futura). */
    incomePending: number;
    estimated: boolean;
  }>;
};
