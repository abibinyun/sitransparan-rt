export interface FamilyMember {
  id: string;
  resident_id: string;
  full_name: string;
  nik: string;
  relation: string;
  birth_date: string;
  gender: string;
  created_at?: string;
  updated_at?: string;
}

export interface Resident {
  id: string;
  tenant_id: string;
  nik: string;
  kk_number: string;
  full_name: string;
  gender: string;
  birth_place: string;
  birth_date: string;
  address: string;
  rt_rw: string;
  phone: string;
  is_head_of_family: boolean;
  family_members?: FamilyMember[];
  created_at?: string;
  updated_at?: string;
}

export interface ResidentFilter {
  search?: string;
  is_head_of_family?: boolean;
  page?: number;
  limit?: number;
}

export interface ResidentListResponse {
  data: Resident[];
  total: number;
  page: number;
  limit: number;
}

export type CreateResidentPayload = Omit<Resident, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'family_members'>;
export type UpdateResidentPayload = Partial<CreateResidentPayload>;

export type CreateFamilyMemberPayload = Omit<FamilyMember, 'id' | 'resident_id' | 'created_at' | 'updated_at'>;
