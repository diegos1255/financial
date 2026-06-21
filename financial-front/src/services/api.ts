import axios from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const match = document.cookie.split('; ').find((row) => row.startsWith('XSRF-TOKEN='));
  if (match) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(match.split('=')[1]);
  }
  return config;
});

const PUBLIC_PATHS = ['/', '/login', '/signup', '/unauthorized', '/session-expired'];

let refreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.['retry-after'];
      const suffix = retryAfter ? ` Aguarde ${retryAfter} segundos.` : '';
      toast.error(`Muitas tentativas.${suffix}`);
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      const code = error.response.data?.code;
      const isOnPublicRoute = PUBLIC_PATHS.includes(window.location.pathname);

      if (isOnPublicRoute) return Promise.reject(error);

      if (code === 'TOKEN_EXPIRED') {
        const originalRequest = error.config;

        if (originalRequest._retry) {
          window.location.href = '/session-expired';
          return Promise.reject(error);
        }

        if (refreshing) {
          return new Promise<void>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => api.request({ ...originalRequest, _retry: true }));
        }

        originalRequest._retry = true;
        refreshing = true;

        return api
          .post('/api/auth/refresh')
          .then(() => {
            processQueue(null);
            return api.request(originalRequest);
          })
          .catch((err) => {
            processQueue(err);
            window.location.href = '/session-expired';
            return Promise.reject(err);
          })
          .finally(() => {
            refreshing = false;
          });
      }

      // On 401 for a mutation, refresh the XSRF-TOKEN cookie with a GET and retry once.
      const originalRequest = error.config;
      const method = (originalRequest?.method ?? 'get').toUpperCase();
      const isMutation = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
      if (isMutation && originalRequest && !originalRequest._csrfRetry) {
        originalRequest._csrfRetry = true;
        try {
          await api.get('/api/users/me');
          return await api.request(originalRequest);
        } catch {
          // fall through to redirect
        }
      }

      window.location.href = '/unauthorized';
    }

    return Promise.reject(error);
  },
);
