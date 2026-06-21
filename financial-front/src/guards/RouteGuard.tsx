import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RouteGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400 text-sm">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
