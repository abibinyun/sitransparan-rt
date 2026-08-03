export type FeePeriod = 'monthly' | 'one_time';
export type PaymentStatus = 'pending' | 'verified' | 'rejected';
export type TransactionType = 'income' | 'expense';

export interface FeeCategory {
  id: string;
  tenant_id: string;
  name: string;
  amount: number;
  period: FeePeriod;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DuesPayment {
  id: string;
  tenant_id: string;
  resident_id: string;
  resident_name?: string;
  fee_category_id: string;
  fee_category_name?: string;
  amount: number;
  period_month: number;
  period_year: number;
  status: PaymentStatus;
  proof_url?: string;
  verified_at?: string;
  verified_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDuesPaymentPayload {
  resident_id: string;
  fee_category_id: string;
  amount: number;
  period_month: number;
  period_year: number;
  proof_url?: string;
}

export interface FinancialTransaction {
  id: string;
  tenant_id: string;
  type: TransactionType;
  category: string;
  amount: number;
  transaction_date: string;
  description?: string;
  proof_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionPayload {
  type: TransactionType;
  category: string;
  amount: number;
  transaction_date: string;
  description?: string;
  proof_url?: string;
}

export interface FinancialSummary {
  total_income: number;
  total_expense: number;
  balance: number;
}

export interface DuesPaymentFilter {
  resident_id?: string;
  fee_category_id?: string;
  status?: PaymentStatus;
  period_month?: number;
  period_year?: number;
  page?: number;
  limit?: number;
}

export interface TransactionFilter {
  type?: TransactionType;
  category?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}
