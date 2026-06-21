import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { IdleWarningModal } from '../ui/IdleWarningModal';
import { useIdleLogout } from '../../hooks/useIdleLogout';

export function ProtectedLayout() {
  const { showWarning, secondsLeft, continueSession } = useIdleLogout(30);

  return (
    <div className="h-full flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <IdleWarningModal
        show={showWarning}
        secondsLeft={secondsLeft}
        onContinue={continueSession}
      />
    </div>
  );
}
