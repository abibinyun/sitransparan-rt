// Helper prefetch rute lazy secara instan saat kursor mengarah ke link (onMouseEnter/onFocus)
const routeLoaders: Record<string, () => Promise<any>> = {
  '/admin': () => import('../pages/DashboardPage'),
  '/admin/residents': () => import('../pages/ResidentsPage'),
  '/admin/financial': () => import('../pages/FinancialPage'),
  '/admin/events': () => import('../pages/EventsPage'),
  '/admin/meetings': () => import('../pages/MeetingPage'),
  '/admin/aspirations': () => import('../pages/AspirationsPage'),
  '/admin/announcements': () => import('../pages/AnnouncementsPage'),
  '/admin/polls': () => import('../pages/PollsPage'),
  '/admin/karang-taruna': () => import('../pages/KarangTarunaPage'),
  '/admin/waste-bank': () => import('../pages/WasteBankPage'),
  '/admin/inventory': () => import('../pages/InventoryPage'),
  '/admin/houses': () => import('../pages/HousesPage'),
  '/admin/audit-logs': () => import('../pages/AuditLogsPage'),
  '/admin/users': () => import('../pages/UsersPage'),
  '/admin/tenants': () => import('../pages/SuperAdminTenantsPage'),
  '/admin/profile': () => import('../pages/ProfilePage'),
  '/': () => import('../pages/PublicAnnouncementsPage'),
  '/kabar': () => import('../pages/PublicAnnouncementsPage'),
  '/usulan': () => import('../pages/PublicAspirationsPage'),
  '/agenda': () => import('../pages/PublicEventsPage'),
  '/program': () => import('../pages/PublicProgramsPage'),
  '/karang-taruna': () => import('../pages/PublicKarangTarunaPage'),
  '/bank-sampah': () => import('../pages/PublicWasteBankPage'),
};

const prefetchedRoutes = new Set<string>();

export function prefetchRoute(path: string) {
  const normalized = path.split('?')[0];
  if (prefetchedRoutes.has(normalized)) return;
  const loader = routeLoaders[normalized];
  if (loader) {
    prefetchedRoutes.add(normalized);
    loader().catch(() => {
      prefetchedRoutes.delete(normalized);
    });
  }
}
