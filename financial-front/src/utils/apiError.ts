import type { ApiError } from '../types/user';

export function extractApiError(
  err: unknown,
  fallback = 'Erro inesperado, tente novamente.',
): string {
  const apiError = (err as { response?: { data?: ApiError } }).response?.data;
  return apiError?.message ?? fallback;
}

export function errorCode(err: unknown): string | undefined {
  return (err as { response?: { data?: { code?: string } } }).response?.data?.code;
}

/**
 * True quando o erro é o 401 GMAIL_REAUTH_REQUIRED — sinal de que o refresh
 * token do Google expirou/foi revogado. Componentes Gmail podem usar isso pra
 * evitar cascata de toasts individuais (o GmailGate já mostra um toast único).
 */
export function isGmailReauthError(err: unknown): boolean {
  return errorCode(err) === 'GMAIL_REAUTH_REQUIRED';
}
