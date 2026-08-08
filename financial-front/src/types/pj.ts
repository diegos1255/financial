export type PjEntryType = 'INVOICE' | 'DAS' | 'INSS' | 'ACCOUNTING';

export type PjEntry = {
  id: string;
  type: PjEntryType;
  year: number;
  month: number;
  amount: number;
  fileName: string;
  contentType: string;
  createdDate: string;
  updatedDate: string;
};

export type PjEntryRequest = {
  type: PjEntryType;
  year: number;
  month: number;
  amount: number;
};

export const PJ_TYPE_LABELS: Record<PjEntryType, string> = {
  INVOICE: 'Nota Fiscal (NF)',
  DAS: 'DAS',
  INSS: 'INSS',
  ACCOUNTING: 'Contabilidade',
};

export const PJ_TYPE_ORDER: PjEntryType[] = ['INVOICE', 'DAS', 'INSS', 'ACCOUNTING'];
