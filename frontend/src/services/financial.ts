import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import {
  Fund,
  FundType,
  FeeCategory,
  FeePeriod,
  DuesPayment,
  CreateDuesPaymentPayload,
  FinancialTransaction,
  CreateTransactionPayload,
  FinancialSummary,
  DuesPaymentFilter,
  TransactionFilter,
} from '../types/financial';

// Funds
export function useFunds() {
  return useQuery({
    queryKey: ['financial', 'funds'],
    queryFn: async () => {
      const res = await api.get<any>('/financial/funds');
      const data: Fund[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      return data;
    },
  });
}

export function useCreateFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; type: FundType; description?: string; is_default?: boolean; pic_user_id?: string | null }) => {
      const res = await api.post<Fund>('/financial/funds', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    },
  });
}

export function useUpdateFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name: string; type: FundType; description?: string; is_default?: boolean; pic_user_id?: string | null }) => {
      const res = await api.put<Fund>(`/financial/funds/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    },
  });
}

export function useDeleteFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/financial/funds/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    },
  });
}

// Fee Categories
export function useFeeCategories() {
  return useQuery({
    queryKey: ['financial', 'categories'],
    queryFn: async () => {
      const res = await api.get<any>('/financial/categories');
      const data: FeeCategory[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      return data;
    },
  });
}

export function useCreateFeeCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; amount: number; period: FeePeriod; description?: string; pic_user_id?: string | null }) => {
      const res = await api.post<FeeCategory>('/financial/categories', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial', 'categories'] });
    },
  });
}

export function useUpdateFeeCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name: string; amount: number; period: FeePeriod; description?: string; pic_user_id?: string | null }) => {
      const res = await api.put<FeeCategory>(`/financial/categories/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial', 'categories'] });
    },
  });
}

export function useDeleteFeeCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/financial/categories/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial', 'categories'] });
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
      const res = await api.get<any>('/financial/dues', { params });
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
      const res = await api.post<DuesPayment>(`/financial/dues/${id}/verify`, { status });
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
      const res = await api.get<any>('/financial/transactions', { params });
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

import { compressImage } from '../utils/imageCompressor';

// Upload Bukti Transfer / Proof
export function useUploadProof() {
  return useMutation({
    mutationFn: async (file: File) => {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.8 });
      const formData = new FormData();
      formData.append('file', compressed);
      const res = await api.post<{ proof_url: string }>('/financial/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
  });
}

// Reset Financial Data (Testing)
export function useResetFinancialData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/financial/reset-data');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    },
  });
}
