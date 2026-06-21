import { LogOut, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

export function Topbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="h-14 border-b border-slate-200 bg-bg-surface flex items-center justify-end gap-3 px-4">
      <div className="flex items-center gap-2 text-sm text-slate-700">
        {user?.photoUrl ? (
          <img
            src={user.photoUrl}
            alt={user.name}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <UserCircle className="h-6 w-6 text-slate-400" />
        )}
        <span>{user?.name ?? user?.login ?? '—'}</span>
      </div>
      <Button variant="ghost" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </header>
  );
}
