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
const PlatformLandingPage = lazy(() => import('./pages/PlatformLandingPage').then(m => ({ default: m.PlatformLandingPage })));
const ResidentsPage = lazy(() => import('./pages/ResidentsPage').then(m => ({ default: m.ResidentsPage })));
const FinancialPage = lazy(() => import('./pages/FinancialPage').then(m => ({ default: m.FinancialPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then(m => ({ default: m.EventsPage })));
const PublicAspirationsPage = lazy(() => import('./pages/PublicAspirationsPage').then(m => ({ default: m.PublicAspirationsPage })));
const AspirationsPage = lazy(() => import('./pages/AspirationsPage').then(m => ({ default: m.AspirationsPage })));
const PublicAnnouncementsPage = lazy(() => import('./pages/PublicAnnouncementsPage').then(m => ({ default: m.PublicAnnouncementsPage })));
const PublicEventsPage = lazy(() => import('./pages/PublicEventsPage').then(m => ({ default: m.PublicEventsPage })));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const MeetingPage = lazy(() => import('./pages/MeetingPage').then(m => ({ default: m.MeetingPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })));
const PollsPage = lazy(() => import('./pages/PollsPage').then(m => ({ default: m.PollsPage })));
const KarangTarunaPage = lazy(() => import('./pages/KarangTarunaPage').then(m => ({ default: m.KarangTarunaPage })));

import { getTenantSlugFromHost } from './utils/tenant';

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

// If on a tenant subdomain (e.g. rt-003.openrt.local), show tenant announcements feed.
// If on platform root (openrt.local / localhost), show platform landing page.
function RootPortalRoute() {
  const isTenantSubdomain = Boolean(getTenantSlugFromHost());
  return isTenantSubdomain ? (
    <PublicLayout>
      <PublicAnnouncementsPage />
    </PublicLayout>
  ) : (
    <PlatformLandingPage />
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Platform Root Landing Page (outside PublicLayout so no tenant header is shown) */}
            <Route path="/" element={<RootPortalRoute />} />

            {/* Public Portal Routes with PublicLayout for Tenant Subdomain */}
            <Route element={<PublicLayout />}>
              <Route path="/kabar" element={<PublicAnnouncementsPage />} />
              <Route path="/usulan" element={<PublicAspirationsPage />} />
              <Route path="/agenda" element={<PublicEventsPage />} />

              {/* Backward compatibility redirects for legacy /public/* paths */}
              <Route path="/public/announcements" element={<Navigate to="/" replace />} />
              <Route path="/public/aspirations" element={<Navigate to="/usulan" replace />} />
              <Route path="/public/events" element={<Navigate to="/agenda" replace />} />
            </Route>

            {/* Protected Internal Routes (/admin namespace) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/admin" element={<DashboardPage />} />
                <Route path="/admin/residents" element={<ResidentsPage />} />
                <Route path="/admin/financial" element={<FinancialPage />} />
                <Route path="/admin/events" element={<EventsPage />} />
                <Route path="/admin/meetings" element={<MeetingPage />} />
                <Route path="/admin/aspirations" element={<AspirationsPage />} />
                <Route path="/admin/announcements" element={<AnnouncementsPage />} />
                <Route path="/admin/polls" element={<PollsPage />} />
                <Route path="/admin/karang-taruna" element={<KarangTarunaPage />} />
                <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'RT_ADMIN']} />}>
                  <Route path="/admin/users" element={<UsersPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                  <Route path="/admin/tenants" element={<SuperAdminTenantsPage />} />
                  {/* Alias for legacy path */}
                  <Route path="/superadmin/tenants" element={<Navigate to="/admin/tenants" replace />} />
                </Route>

                {/* Backward compatibility redirects for internal routes without /admin prefix */}
                <Route path="/residents" element={<Navigate to="/admin/residents" replace />} />
                <Route path="/financial" element={<Navigate to="/admin/financial" replace />} />
                <Route path="/events" element={<Navigate to="/admin/events" replace />} />
                <Route path="/meetings" element={<Navigate to="/admin/meetings" replace />} />
                <Route path="/aspirations" element={<Navigate to="/admin/aspirations" replace />} />
                <Route path="/announcements" element={<Navigate to="/admin/announcements" replace />} />
                <Route path="/polls" element={<Navigate to="/admin/polls" replace />} />
                <Route path="/karang-taruna" element={<Navigate to="/admin/karang-taruna" replace />} />
                <Route path="/users" element={<Navigate to="/admin/users" replace />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
