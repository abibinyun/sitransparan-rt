export type Role = 'SUPER_ADMIN' | 'RT_ADMIN' | 'RESIDENT' | 'superadmin' | 'admin_rt' | 'resident';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  status?: string; // 'active' | 'inactive'
  code?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  house_id?: string;
  role: Role;
  tenants: Tenant[];
}

export interface AuthState {
  token: string | null;
  user: User | null;
  activeTenant: Tenant | null;
  setAuth: (token: string, user: User, activeTenant?: Tenant | null) => void;
  setActiveTenant: (tenant: Tenant | null) => void;
  updateUser: (partialUser: Partial<User>) => void;
  logout: () => void;
}
