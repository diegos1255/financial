import { useNavigate } from 'react-router-dom';
import { Lock, LogIn } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-full flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Você precisa fazer login</h1>
        <p className="text-slate-500 mb-6">
          Essa página exige autenticação. Faça login para continuar.
        </p>
        <Button onClick={() => navigate('/login', { replace: true })}>
          <LogIn className="h-4 w-4" />
          Ir para o Login
        </Button>
      </div>
    </div>
  );
}
