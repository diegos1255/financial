import type { ApiError } from '../types/user';

export function extractApiError(
  err: unknown,
  fallback = 'Erro inesperado, tente novamente.',
): string {
  const apiError = (err as { response?: { data?: ApiError } }).response?.data;
  return apiError?.message ?? fallback;
}
