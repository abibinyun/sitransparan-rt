import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/MainLayout';
import { PublicLayout } from './components/PublicLayout';
import { Skeleton } from './components/ui/skeleton';

// Code splitting with React.lazy
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SuperAdminTenantsPage = lazy(() => import('./pages/SuperAdminTenantsPage').then(m => ({ default: m.SuperAdminTenantsPage })));
const ResidentsPage = lazy(() => import('./pages/ResidentsPage').then(m => ({ default: m.ResidentsPage })));
const FinancialPage = lazy(() => import('./pages/FinancialPage').then(m => ({ default: m.FinancialPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then(m => ({ default: m.EventsPage })));
const PublicAspirationsPage = lazy(() => import('./pages/PublicAspirationsPage').then(m => ({ default: m.PublicAspirationsPage })));
const AspirationsPage = lazy(() => import('./pages/AspirationsPage').then(m => ({ default: m.AspirationsPage })));
const PublicAnnouncementsPage = lazy(() => import('./pages/PublicAnnouncementsPage').then(m => ({ default: m.PublicAnnouncementsPage })));
const PublicEventsPage = lazy(() => import('./pages/PublicEventsPage').then(m => ({ default: m.PublicEventsPage })));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })));

const PageLoader = () => (
  <div className="flex flex-col space-y-4 p-8 max-w-7xl mx-auto w-full">
    <Skeleton className="h-10 w-64 rounded-xl" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
    <Skeleton className="h-96 rounded-xl w-full" />
  </div>
);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
                <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'RT_ADMIN']} />}>
                  <Route path="/users" element={<UsersPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                  <Route path="/superadmin/tenants" element={<SuperAdminTenantsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/public/announcements" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
