import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getTenantSlugOrFallback } from '../utils/tenant';

export interface PublicMeeting {
  id: string;
  title: string;
  agenda: string;
  meeting_date: string;
  location: string;
  meeting_type: string;
  status: string;
}

export interface PublicFundSummary {
  id: string;
  name: string;
  type: string;
  is_default: boolean;
  balance: number;
}

export interface PublicFinancialSummary {
  current_balance: number;
  monthly_income: number;
  monthly_expense: number;
  spending_breakdown: Array<{ category: string; amount: number }>;
  funds?: PublicFundSummary[];
}

export function usePublicMeetings() {
  const slug = getTenantSlugOrFallback();
  return useQuery<PublicMeeting[], Error>({
    queryKey: ['public-meetings', slug],
    queryFn: async () => {
      try {
        const res = await axios.get<{ data: PublicMeeting[] }>(`/api/v1/t/${slug}/meetings`);
        return res.data.data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 0,
  });
}

export function usePublicFinancialSummary() {
  const slug = getTenantSlugOrFallback();
  return useQuery<PublicFinancialSummary | null, Error>({
    queryKey: ['public-financial-summary', slug],
    queryFn: async () => {
      try {
        const res = await axios.get<PublicFinancialSummary>(`/api/v1/t/${slug}/financial-summary`);
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 0,
  });
}

export interface PublicEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  status: string;
}

export function usePublicEvents() {
  const slug = getTenantSlugOrFallback();
  return useQuery<PublicEvent[], Error>({
    queryKey: ['public-events', slug],
    queryFn: async () => {
      try {
        const res = await axios.get<{ data: PublicEvent[] }>(`/api/v1/t/${slug}/events`);
        return res.data.data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 0,
  });
}

/** "Rp 1.335.000" — pemisah ribuan tanpa desimal. */
export function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

export interface PublicFeeCategory {
  id: string;
  name: string;
  amount: number;
  period: string;
  description?: string;
  collected: number;
  spent: number;
  balance: number;
}

export function usePublicFeeCategories() {
  const slug = getTenantSlugOrFallback();
  return useQuery<PublicFeeCategory[], Error>({
    queryKey: ['public-fee-categories', slug],
    queryFn: async () => {
      try {
        const res = await axios.get<{ data: PublicFeeCategory[] }>(`/api/v1/t/${slug}/financial/categories`);
        return res.data.data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 0,
  });
}

export interface PublicTransaction {
  id: string;
  fund_id?: string;
  fund_name?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  transaction_date: string;
  description?: string;
}

export function usePublicTransactions(params?: { fund_id?: string; category?: string; limit?: number }) {
  const slug = getTenantSlugOrFallback();
  return useQuery<PublicTransaction[], Error>({
    queryKey: ['public-transactions', slug, params?.fund_id, params?.category],
    queryFn: async () => {
      try {
        const res = await axios.get<{ data: PublicTransaction[] }>(`/api/v1/t/${slug}/financial/transactions`, {
          params,
        });
        return res.data.data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 0,
  });
}
