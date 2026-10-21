import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MetricsProvider } from './context/MetricsContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout/Layout';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ServerPage } from './pages/ServerPage';
import { DockerPage } from './pages/DockerPage';
import { ServicesPage } from './pages/ServicesPage';
import { DomainsPage } from './pages/DomainsPage';
import { OraclePage } from './pages/OraclePage';
import { NewsPage } from './pages/NewsPage';
import { AlertsPage } from './pages/AlertsPage';
import { CheckupPage } from './pages/CheckupPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#070b12] flex items-center justify-center text-slate-500 font-mono text-xs">
        Carregando sessão VPS Multivus...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MetricsProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="server" element={<ServerPage />} />
                <Route path="docker" element={<DockerPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="domains" element={<DomainsPage />} />
                <Route path="oracle" element={<OraclePage />} />
                <Route path="oracle/free-tier" element={<OraclePage />} />
                <Route path="oracle/billing" element={<OraclePage />} />
                <Route path="news" element={<NewsPage />} />
                <Route path="news/reddit" element={<NewsPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="incidents" element={<AlertsPage />} />
                <Route path="history" element={<ServerPage />} />
                <Route path="checkup" element={<CheckupPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </MetricsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
