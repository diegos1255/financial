import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Wallet } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ImageUploader } from '../components/ui/ImageUploader';
import type { ApiError } from '../types/user';

export function SignupPage() {
  const navigate = useNavigate();
  const { signup, setUser } = useAuth();

  const [name, setName] = useState('');
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      await signup({ name: name.trim(), login: loginValue.trim(), password });

      if (photo) {
        try {
          const updatedUser = await authService.uploadPhoto(photo);
          setUser(updatedUser);
        } catch {
          // foto opcional — ignora falha aqui
        }
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiError = (err as { response?: { data?: ApiError } }).response?.data;
      if (apiError?.fieldErrors?.length) {
        const map: Record<string, string> = {};
        apiError.fieldErrors.forEach((f) => { map[f.field] = f.message; });
        setFieldErrors(map);
      } else {
        setErrorMessage(apiError?.message ?? 'Não foi possível criar a conta');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="rounded-full bg-accent-soft p-3">
            <Wallet className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Criar conta</h1>
          <p className="text-sm text-slate-500">Preencha os dados para começar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ImageUploader onChange={setPhoto} disabled={submitting} />

          <Input
            id="name"
            label="Nome"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            disabled={submitting}
            autoFocus
            error={fieldErrors['name']}
          />
          <Input
            id="login"
            label="Login"
            type="text"
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            autoComplete="username"
            disabled={submitting}
            error={fieldErrors['login']}
          />
          <Input
            id="password"
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={submitting}
            error={fieldErrors['password']}
          />
          <p className="text-[11px] text-slate-400 -mt-2">
            Mínimo 10 caracteres com maiúscula, minúscula, número e caractere especial.
          </p>

          {errorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full mt-2">
            <UserPlus className="h-4 w-4" />
            {submitting ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-slate-500">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
