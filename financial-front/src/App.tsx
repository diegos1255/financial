import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { RouteGuard } from './guards/RouteGuard';
import { ProtectedLayout } from './components/layout/ProtectedLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { SessionExpiredPage } from './pages/SessionExpiredPage';
import { DashboardPage } from './pages/DashboardPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { BankAccountsPage } from './pages/bank-accounts/BankAccountsPage';
import { InvestmentsPage } from './pages/investments/InvestmentsPage';
import { SalariesPage } from './pages/salaries/SalariesPage';
import { ExpensesPage } from './pages/expenses/ExpensesPage';
import { PjPage } from './pages/pj/PjPage';
import { GmailGate } from './pages/gmail/GmailGate';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/session-expired" element={<SessionExpiredPage />} />

          <Route
            element={
              <RouteGuard>
                <ProtectedLayout />
              </RouteGuard>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/bank-accounts" element={<BankAccountsPage />} />
            <Route path="/investments" element={<InvestmentsPage />} />
            <Route path="/salaries" element={<SalariesPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/pj" element={<PjPage />} />
            <Route path="/email" element={<GmailGate />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            fontSize: '14px',
          },
        }}
      />
    </AuthProvider>
  );
}
