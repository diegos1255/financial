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

export type UnreadSummary = {
  totalUnread: number;
  latestUnreadId: string | null;
  latestUnreadFrom: string | null;
  latestUnreadSubject: string | null;
};

export type GmailBulkAction = 'ARCHIVE' | 'TRASH' | 'READ' | 'UNREAD';

export type BulkActionResponse = {
  successCount: number;
  failedIds: string[];
};

export type LabelSummary = {
  id: string;
  name: string;
  type: 'system' | 'user';
  messagesUnread: number | null;
  messagesTotal: number | null;
};

export type SendMessageRequest = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
};

export type SendMessageResponse = {
  messageId: string;
  threadId: string;
};

export const CATEGORY_LABELS: Record<GmailCategory, string> = {
  PRIMARY: 'Principal',
  SOCIAL: 'Social',
  PROMOTIONS: 'Promoções',
  UPDATES: 'Atualizações',
};
