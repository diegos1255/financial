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
