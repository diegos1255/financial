import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Wallet } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { ApiError } from '../types/user';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // "Manter-se logado" — ocultado a pedido do Diego. Descomente para reativar.
  // const [rememberMe, setRememberMe] = useState<boolean>(
  //   () => localStorage.getItem('remember_me') === 'true'
  // );
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
      // localStorage.setItem('remember_me', String(rememberMe));
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
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={submitting}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* "Manter-se logado" — ocultado a pedido do Diego. Descomente para reativar. */}
          {/*
          <label className="flex items-center gap-2 cursor-pointer select-none -mt-1">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={submitting}
              className="rounded border-slate-300 text-accent focus:ring-accent"
            />
            <span className="text-sm text-slate-600">Manter-se logado</span>
          </label>
          */}

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
