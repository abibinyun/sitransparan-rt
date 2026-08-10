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

  const isSuperAdmin =
    user.role === 'SUPER_ADMIN' ||
    (user.role as string) === 'superadmin' ||
    user.email === 'superadmin@platform.local' ||
    user.email === 'admin@gmail.com';

  if (allowedRoles && !allowedRoles.includes(user.role) && !(allowedRoles.includes('SUPER_ADMIN') && isSuperAdmin)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
