export type Role = 'SUPER_ADMIN' | 'RT_ADMIN' | 'RESIDENT';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  code?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenants: Tenant[];
}

export interface AuthState {
  token: string | null;
  user: User | null;
  activeTenant: Tenant | null;
  setAuth: (token: string, user: User, activeTenant?: Tenant | null) => void;
  setActiveTenant: (tenant: Tenant | null) => void;
  logout: () => void;
}
