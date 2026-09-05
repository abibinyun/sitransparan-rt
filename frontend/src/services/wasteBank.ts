import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface WasteCategory {
  id: string;
  tenant_id: string;
  name: string;
  unit: string;
  price_per_unit: number;
  resident_share_pct: number;
  karang_taruna_share_pct: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WasteDepositItem {
  id?: string;
  deposit_id?: string;
  category_id: string;
  category_name?: string;
  unit?: string;
  quantity: number;
  price_per_unit: number;
  subtotal: number;
  resident_share_amount: number;
  karang_taruna_share_amount: number;
}

export interface WasteDeposit {
  id: string;
  tenant_id: string;
  family_head_name: string;
  kk_number: string;
  rt_number?: string;
  house_number?: string;
  deposit_date: string;
  total_weight_kg: number;
  total_gross_amount: number;
  resident_earnings_amount: number;
  karang_taruna_amount: number;
  status: 'pending' | 'verified' | 'paid_out' | 'cancelled';
  payout_method: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
  updated_at: string;
  items?: WasteDepositItem[];
}

export interface WasteBankSummary {
  total_deposits: number;
  total_weight_kg: number;
  total_gross_value: number;
  total_resident_earnings: number;
  total_karang_taruna_share: number;
  active_households_count: number;
}

export interface HouseholdAccumulation {
  family_head_name: string;
  kk_number: string;
  rt_number: string;
  house_number: string;
  deposit_count: number;
  total_weight_kg: number;
  total_earnings_amount: number;
  last_deposit_date: string;
}

export const wasteBankService = {
  // Public
  getPublicCategories: async (slug: string): Promise<WasteCategory[]> => {
    const res = await api.get<{ data: WasteCategory[] }>(`/t/${slug}/waste-bank/categories`);
    return res.data.data;
  },
  getPublicSummary: async (slug: string): Promise<WasteBankSummary> => {
    const res = await api.get<WasteBankSummary>(`/t/${slug}/waste-bank/summary`);
    return res.data;
  },

  // Admin / Protected
  getCategories: async (activeOnly = false): Promise<WasteCategory[]> => {
    const res = await api.get<{ data: WasteCategory[] }>(`/waste-bank/categories`, {
      params: { active_only: activeOnly ? 'true' : 'false' }
    });
    return res.data.data;
  },
  createCategory: async (data: Partial<WasteCategory>): Promise<WasteCategory> => {
    const res = await api.post<{ data: WasteCategory }>(`/waste-bank/categories`, data);
    return res.data.data;
  },
  updateCategory: async (id: string, data: Partial<WasteCategory>): Promise<WasteCategory> => {
    const res = await api.put<{ data: WasteCategory }>(`/waste-bank/categories/${id}`, data);
    return res.data.data;
  },
  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/waste-bank/categories/${id}`);
  },

  getDeposits: async (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const res = await api.get<{ data: WasteDeposit[]; total: number }>(`/waste-bank/deposits`, { params });
    return res.data;
  },
  getDepositById: async (id: string): Promise<WasteDeposit> => {
    const res = await api.get<WasteDeposit>(`/waste-bank/deposits/${id}`);
    return res.data;
  },
  createDeposit: async (data: Partial<WasteDeposit>): Promise<WasteDeposit> => {
    const res = await api.post<{ data: WasteDeposit }>(`/waste-bank/deposits`, data);
    return res.data.data;
  },
  updateDepositStatus: async (id: string, status: string): Promise<void> => {
    await api.patch(`/waste-bank/deposits/${id}/status`, { status });
  },
  getSummary: async (): Promise<WasteBankSummary> => {
    const res = await api.get<WasteBankSummary>(`/waste-bank/summary`);
    return res.data;
  },
  getHouseholdAccumulations: async (page = 1, limit = 50) => {
    const res = await api.get<{ data: HouseholdAccumulation[]; total: number }>(`/waste-bank/households`, {
      params: { page, limit }
    });
    return res.data;
  },
};

export function useHouseholdAccumulationsQuery(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['waste-bank-households', page, limit],
    queryFn: () => wasteBankService.getHouseholdAccumulations(page, limit),
  });
}
