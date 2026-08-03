import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { Tenant } from '../types/auth';

export const TenantSwitcher: React.FC = () => {
  const { user, activeTenant, setActiveTenant } = useAuthStore();

  if (!user || !user.tenants || user.tenants.length <= 1) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = user.tenants.find((t) => t.id === e.target.value) || null;
    setActiveTenant(selected);
  };

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="tenant-select" className="text-sm font-medium text-gray-700">
        Active RT:
      </label>
      <select
        id="tenant-select"
        value={activeTenant?.id || ''}
        onChange={handleChange}
        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {user.tenants.map((t: Tenant) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.code})
          </option>
        ))}
      </select>
    </div>
  );
};
