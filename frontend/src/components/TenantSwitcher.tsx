import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSwitchTenantMutation } from '../services/auth';
import type { Tenant } from '../types/auth';
import { Select } from './ui/select';

export const TenantSwitcher: React.FC = () => {
  const { user, activeTenant, setAuth } = useAuthStore();
  const switchTenantMutation = useSwitchTenantMutation();

  if (!user || !user.tenants || user.tenants.length <= 1) {
    return null;
  }

  const handleSwitch = async (tenantId: string) => {
    const selected = user.tenants?.find((t) => t.id === tenantId) || null;
    if (!selected) return;
    try {
      // Server-verified tenant switch: the backend re-issues a JWT scoped to
      // the selected tenant only if the user is actually mapped to it.
      const switched = await switchTenantMutation.mutateAsync(selected.id);
      const nextUser = {
        ...switched.user,
        role: (switched.user.role || user.role) as typeof user.role,
        tenants: user.tenants,
      };
      setAuth(switched.token, nextUser, selected);
    } catch {
      // Ignore: the active tenant stays unchanged when the switch is denied.
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="tenant-select" className="text-xs font-medium text-[#707070] shrink-0">
        Active RT:
      </label>
      <div className="w-48">
        <Select
          id="tenant-select"
          value={activeTenant?.id || ''}
          onValueChange={handleSwitch}
        >
          {user.tenants.map((t: Tenant) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.code || t.slug})
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
};
