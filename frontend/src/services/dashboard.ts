import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { FinancialSummary, FinancialTransaction } from '../types/financial';

export async function exportFinancialReport(format: 'csv' | 'pdf', params?: { start_date?: string; end_date?: string }): Promise<void> {
  const res = await api.get('/dashboard/reports/financial/export', {
    params: { format, ...params },
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const disposition = (res.headers as any)?.['content-disposition'] as string | undefined;
  let filename = format === 'pdf' ? 'laporan_keuangan.pdf' : 'laporan_keuangan.csv';
  if (disposition) {
    const m = disposition.match(/filename="?([^"]+)"?/);
    if (m) filename = m[1];
  }
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface DashboardMetrics {
  totalResidents: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingDues: number;
  monthlyTrend: {
    month: string;
    income: number;
    expense: number;
  }[];
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      let summary: FinancialSummary = { current_balance: 0, monthly_income: 0, monthly_expense: 0 };
      let totalResidents = 0;
      let pendingDues = 0;
      let transactions: FinancialTransaction[] = [];

      const [sumRes, resRes, duesRes, txRes] = await Promise.allSettled([
        api.get<FinancialSummary>('/financial/summary'),
        api.get<any>('/residents'),
        api.get<any>('/financial/dues', { params: { status: 'pending', limit: 1000 } }),
        api.get<FinancialTransaction[]>('/financial/transactions'),
      ]);

      if (sumRes.status === 'fulfilled') {
        summary = sumRes.value.data;
      }

      if (resRes.status === 'fulfilled') {
        const val = resRes.value.data;
        if (Array.isArray(val)) {
          totalResidents = val.length;
        } else if (val?.data && Array.isArray(val.data)) {
          totalResidents = val.data.length;
        } else if (typeof val?.total === 'number') {
          totalResidents = val.total;
        }
      }

      if (duesRes.status === 'fulfilled') {
        const dVal = duesRes.value.data;
        const arr = Array.isArray(dVal) ? dVal : (Array.isArray(dVal?.data) ? dVal.data : []);
        pendingDues = arr.filter((d: any) => d.status === 'pending' || !d.status).length;
        if (typeof dVal?.total === 'number' && arr.length === dVal.total) {
          pendingDues = typeof dVal.total === 'number' ? dVal.total : pendingDues;
        }
      }

      if (txRes.status === 'fulfilled') {
        const tVal = txRes.value.data;
        if (Array.isArray(tVal)) {
          transactions = tVal;
        }
      }

      // Group monthly trend from transactions (real data only)
      const trendMap: Record<string, { income: number; expense: number }> = {};
      transactions.forEach((tx) => {
        const date = new Date(tx.transaction_date || tx.created_at);
        const monthKey = isNaN(date.getTime())
          ? 'Bulan Ini'
          : date.toLocaleString('id-ID', { month: 'short', year: '2-digit' });
        if (!trendMap[monthKey]) {
          trendMap[monthKey] = { income: 0, expense: 0 };
        }
        if (tx.type === 'income') {
          trendMap[monthKey].income += tx.amount || 0;
        } else {
          trendMap[monthKey].expense += tx.amount || 0;
        }
      });

      const monthlyTrend = Object.entries(trendMap).map(([month, val]) => ({
        month,
        income: val.income,
        expense: val.expense,
      }));

      return {
        totalResidents,
        totalIncome: summary.monthly_income,
        totalExpense: summary.monthly_expense,
        balance: summary.current_balance,
        pendingDues,
        monthlyTrend,
      } as DashboardMetrics;
    },
  });
}
