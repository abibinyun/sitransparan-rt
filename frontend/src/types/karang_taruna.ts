export type KarangTarunaPeriodStatus = 'draft' | 'active' | 'archived';
export type KarangTarunaMemberStatus = 'aktif' | 'demisioner' | 'nonaktif';

export interface KarangTarunaConfig {
  period_id: string;
  allowed_roles: string[];
  allowed_sections: string[];
  updated_at: string;
}

export interface KarangTarunaPeriod {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: KarangTarunaPeriodStatus;
  sk_number?: string;
  sk_file_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  config?: KarangTarunaConfig;
}

export interface KarangTarunaMember {
  id: string;
  period_id: string;
  resident_id: string;
  role: string;
  section?: string;
  custom_title?: string;
  phone_override?: string;
  status: KarangTarunaMemberStatus;
  joined_at: string;
  created_at: string;
  updated_at: string;
  resident_name?: string;
  resident_nik?: string;
  phone?: string;
}
