import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import {
  FeeCategory,
  DuesPayment,
  CreateDuesPaymentPayload,
  FinancialTransaction,
  CreateTransactionPayload,
  FinancialSummary,
  DuesPaymentFilter,
  TransactionFilter,
} from '../types/financial';

// Fee Categories
export function useFeeCategories() {
  return useQuery({
    queryKey: ['financial', 'categories'],
    queryFn: async () => {
      const res = await api.get<FeeCategory[]>('/financial/categories');
      return res.data;
    },
  });
}

// Financial Summary (Kas RT: Total Masuk, Keluar, Saldo)
export function useFinancialSummary() {
  return useQuery({
    queryKey: ['financial', 'summary'],
    queryFn: async () => {
      const res = await api.get<FinancialSummary>('/financial/summary');
      return res.data;
    },
  });
}

// Dues Payments
export function useDuesPayments(params?: DuesPaymentFilter) {
  return useQuery({
    queryKey: ['financial', 'dues', params],
    queryFn: async () => {
      const res = await api.get<DuesPayment[]>('/financial/dues', { params });
      return res.data;
    },
  });
}

export function useCreateDuesPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDuesPaymentPayload) => {
      const res = await api.post<DuesPayment>('/financial/dues', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    },
  });
}

export function useVerifyDuesPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'verified' | 'rejected' }) => {
      const res = await api.patch<DuesPayment>(`/financial/dues/${id}/verify`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    },
  });
}

// Financial Transactions
export function useFinancialTransactions(params?: TransactionFilter) {
  return useQuery({
    queryKey: ['financial', 'transactions', params],
    queryFn: async () => {
      const res = await api.get<FinancialTransaction[]>('/financial/transactions', { params });
      return res.data;
    },
  });
}

export function useCreateFinancialTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTransactionPayload) => {
      const res = await api.post<FinancialTransaction>('/financial/transactions', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    },
  });
}

// Upload Bukti Transfer / Proof
export function useUploadProof() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string }>('/financial/upload-proof', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
  });
}
