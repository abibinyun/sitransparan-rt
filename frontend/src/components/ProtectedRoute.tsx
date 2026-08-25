import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { Role } from '../types/auth';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const roleStr = String(user.role).toLowerCase();
  const isSuperAdmin = roleStr === 'superadmin' || roleStr === 'super_admin';
  const isAdminRT = roleStr === 'admin_rt' || roleStr === 'rt_admin';

  if (allowedRoles) {
    const isAllowed = allowedRoles.some((r) => {
      const allowed = String(r).toLowerCase();
      if (allowed === 'super_admin' || allowed === 'superadmin') return isSuperAdmin;
      if (allowed === 'rt_admin' || allowed === 'admin_rt') return isAdminRT;
      return allowed === roleStr;
    });

    if (!isAllowed) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};
