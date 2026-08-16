import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Briefcase,
  CircleDot,
  CreditCard,
  DollarSign,
  Home,
  LogOut,
  Mail,
  ShoppingCart,
  Tag,
  TrendingUp,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { menuService } from '../../services/menuService';
import type { Menu } from '../../types/menu';
import { useAuth } from '../../hooks/useAuth';

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  tag: Tag,
  'credit-card': CreditCard,
  'dollar-sign': DollarSign,
  'shopping-cart': ShoppingCart,
  'trending-up': TrendingUp,
  briefcase: Briefcase,
  mail: Mail,
};

function MenuIcon({ icon }: { icon: string | null }) {
  const Component = icon ? (ICON_MAP[icon] ?? CircleDot) : CircleDot;
  return <Component className="h-4 w-4" />;
}

function MenuSkeleton() {
  return (
    <ul className="flex flex-col gap-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-md px-3 py-2">
          <span className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
          <span className="h-3 w-32 rounded bg-slate-200 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

export function Sidebar() {
  const [menus, setMenus] = useState<Menu[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    let cancelled = false;
    menuService
      .getMenus()
      .then((data) => {
        if (!cancelled) setMenus(data);
      })
      .catch(() => {
        if (!cancelled) setError('Falha ao carregar menus');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="w-60 shrink-0 bg-bg-surface border-r border-slate-200 flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-slate-200">
        <h1 className="text-lg font-semibold text-slate-900">Controle Financeiro</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {menus === null && !error && <MenuSkeleton />}
        {error && <p className="text-sm text-red-600 px-3 py-2">{error}</p>}
        {menus && (
          <ul className="flex flex-col gap-1">
            {menus.map((item) => (
              <li key={item.id}>
                <NavLink
                  to={item.route ?? '#'}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-accent-soft text-accent font-medium'
                        : 'text-slate-600 hover:bg-bg-elevated hover:text-slate-900',
                    ].join(' ')
                  }
                >
                  <MenuIcon icon={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </nav>

      {user && (
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <UserCircle className="h-8 w-8 text-slate-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.login}</p>
            </div>
            <button
              onClick={logout}
              title="Sair"
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
