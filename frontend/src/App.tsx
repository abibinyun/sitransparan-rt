import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/LoginPage';
import { SuperAdminTenantsPage } from './pages/SuperAdminTenantsPage';
import { ResidentsPage } from './pages/ResidentsPage';
import { FinancialPage } from './pages/FinancialPage';
import { EventsPage } from './pages/EventsPage';
import { PublicAspirationsPage } from './pages/PublicAspirationsPage';
import { AspirationsPage } from './pages/AspirationsPage';
import { PublicAnnouncementsPage } from './pages/PublicAnnouncementsPage';
import { PublicEventsPage } from './pages/PublicEventsPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/MainLayout';
import { PublicLayout } from './components/PublicLayout';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Public Portal Routes with PublicLayout */}
          <Route element={<PublicLayout />}>
            <Route path="/public/announcements" element={<PublicAnnouncementsPage />} />
            <Route path="/public/aspirations" element={<PublicAspirationsPage />} />
            <Route path="/public/events" element={<PublicEventsPage />} />
          </Route>

          {/* Protected Internal Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/residents" element={<ResidentsPage />} />
              <Route path="/financial" element={<FinancialPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/aspirations" element={<AspirationsPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                <Route path="/superadmin/tenants" element={<SuperAdminTenantsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/public/announcements" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
