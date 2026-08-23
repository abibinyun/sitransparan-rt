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

export interface PublicFinancialSummary {
  current_balance: number;
  monthly_income: number;
  monthly_expense: number;
  spending_breakdown: Array<{ category: string; amount: number }>;
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
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
  });
}

/** "Rp 1.335.000" — pemisah ribuan tanpa desimal. */
export function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}
