import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/authService';
import type { LoginRequest, SignupRequest, User } from '../types/user';

const LEGACY_TOKEN_KEY = 'auth_token';
const LEGACY_USER_KEY = 'auth_user';
const PUBLIC_PATHS = ['/login', '/signup', '/unauthorized', '/session-expired'];

export type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  bootstrapping: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  signup: (payload: SignupRequest, photo: File | null) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapping, setBootstrapping] = useState<boolean>(true);

  useEffect(() => {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);

    if (PUBLIC_PATHS.includes(window.location.pathname)) {
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    authService
      .me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        // 401 já é tratado pelo interceptor (redirect pra /unauthorized ou /session-expired).
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    const result = await authService.login(payload);
    setUser(result.user);
  }, []);

  const signup = useCallback(async (payload: SignupRequest, photo: File | null) => {
    const result = await authService.signup(payload, photo);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, bootstrapping, login, signup, logout, setUser }),
    [user, bootstrapping, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
