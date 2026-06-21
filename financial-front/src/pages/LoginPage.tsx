import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Wallet } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { ApiError } from '../types/user';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    if (!loginValue.trim() || !password) {
      setErrorMessage('Informe login e senha');
      return;
    }
    setSubmitting(true);
    try {
      await login({ login: loginValue.trim(), password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiError = (err as { response?: { data?: ApiError } }).response?.data;
      setErrorMessage(apiError?.message ?? 'Não foi possível fazer login');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="rounded-full bg-accent-soft p-3">
            <Wallet className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Controle Financeiro</h1>
          <p className="text-sm text-slate-500">Entre para acessar sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="login"
            label="Login"
            type="text"
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            autoComplete="username"
            disabled={submitting}
            autoFocus
          />
          <Input
            id="password"
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={submitting}
          />

          {errorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full mt-2">
            <LogIn className="h-4 w-4" />
            {submitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-slate-500">
          Ainda não tem conta?{' '}
          <Link to="/signup" className="font-medium text-accent hover:underline">
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  );
}
