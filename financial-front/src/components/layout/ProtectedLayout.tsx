import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { IdleWarningModal } from '../ui/IdleWarningModal';
import { useIdleLogout } from '../../hooks/useIdleLogout';
import { GmailNotificationsProvider } from '../../contexts/GmailNotificationsContext';
import { ChatWidget } from '../chat/ChatWidget';

export function ProtectedLayout() {
  const { showWarning, secondsLeft, continueSession } = useIdleLogout(30);

  return (
    <GmailNotificationsProvider>
      <div className="h-full flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          {/* pb-24: respiro para a bolinha flutuante do chat nao cobrir paginacao/acoes no fim da pagina */}
          <main className="flex-1 overflow-y-auto p-6 pb-24">
            <Outlet />
          </main>
        </div>
        <IdleWarningModal
          show={showWarning}
          secondsLeft={secondsLeft}
          onContinue={continueSession}
        />
        <ChatWidget />
      </div>
    </GmailNotificationsProvider>
  );
}
