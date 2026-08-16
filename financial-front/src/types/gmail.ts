export type GmailStatus = {
  connected: boolean;
  emailAddress: string | null;
};

export type GmailAuthUrl = {
  authUrl: string;
};

export type GmailCategory = 'PRIMARY' | 'SOCIAL' | 'PROMOTIONS' | 'UPDATES';

export type ThreadSummary = {
  id: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
  unread: boolean;
  messageCount: number;
};

export type MessageDetail = {
  id: string;
  from: string;
  to: string[];
  cc: string[];
  date: string;
  bodyHtml: string;
  labelIds: string[];
  unread: boolean;
};

export type ThreadDetail = {
  id: string;
  subject: string;
  messages: MessageDetail[];
};

export type PagedThreadsResponse = {
  items: ThreadSummary[];
  nextPageToken: string | null;
};

export const CATEGORY_LABELS: Record<GmailCategory, string> = {
  PRIMARY: 'Principal',
  SOCIAL: 'Social',
  PROMOTIONS: 'Promoções',
  UPDATES: 'Atualizações',
};
