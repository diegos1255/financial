export type ChatStatus = {
  enabled: boolean;
};

export type ChunkSource = {
  sourcePath: string;
  section: string | null;
  score: number;
};

export type ChatAnswer = {
  answer: string;
  sources: ChunkSource[];
  tookMs: number;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChunkSource[];
  loading?: boolean;
  error?: string;
};
