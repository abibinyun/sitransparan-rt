export type FeePeriod = 'monthly' | 'one_time';
export type PaymentStatus = 'pending' | 'verified' | 'rejected';
export type TransactionType = 'income' | 'expense';
export type FundType = 'operational' | 'social' | 'youth' | 'infrastructure' | 'other';

export interface Fund {
  id: string;
  tenant_id: string;
  name: string;
  type: FundType;
  description?: string;
  is_default: boolean;
  balance?: number;
  created_at: string;
  updated_at: string;
}

export interface FeeCategory {
  id: string;
  tenant_id: string;
  name: string;
  amount: number;
  period: FeePeriod;
  description?: string;
  balance?: number;
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
  fund_id?: string;
  fund_name?: string;
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
  fund_id?: string;
  category: string;
  amount: number;
  transaction_date: string;
  description?: string;
  proof_url?: string;
}

export interface FinancialSummary {
  current_balance: number;
  monthly_income: number;
  monthly_expense: number;
  spending_breakdown?: { category: string; amount: number }[];
  funds?: Fund[];
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
  fund_id?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}
