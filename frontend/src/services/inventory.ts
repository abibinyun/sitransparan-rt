import { api } from './api';

export interface InventoryItem {
  id: string;
  item_code?: string;
  name: string;
  category: string;
  description?: string;
  quantity: number;
  available_quantity: number;
  unit: string;
  condition: 'good' | 'fair' | 'damaged' | 'lost' | string;
  location?: string;
  source_fund?: string;
  purchase_date?: string;
  purchase_price?: number;
  photo_url?: string;
  is_borrowable: boolean;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryBorrowing {
  id: string;
  item_id: string;
  item_name?: string;
  item_code?: string;
  unit?: string;
  borrower_name: string;
  borrower_phone?: string;
  borrower_resident_id?: string;
  borrower_house_id?: string;
  quantity: number;
  purpose?: string;
  borrow_date: string;
  expected_return_date?: string;
  actual_return_date?: string;
  condition_before?: string;
  condition_after?: string;
  admin_notes?: string;
  status: 'pending' | 'approved' | 'borrowed' | 'returned' | 'rejected' | 'cancelled' | 'overdue' | string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryFilter {
  category?: string;
  condition?: string;
  is_borrowable?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface BorrowingFilter {
  item_id?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const inventoryService = {
  async getItems(params?: InventoryFilter) {
    const res = await api.get<{ data: InventoryItem[]; total: number }>('/inventory/items', { params });
    return res.data;
  },

  async getItemById(id: string) {
    const res = await api.get<{ data: InventoryItem }>(`/inventory/items/${id}`);
    return res.data.data;
  },

  async createItem(payload: Partial<InventoryItem>) {
    const res = await api.post<{ data: InventoryItem; message: string }>('/inventory/items', payload);
    return res.data;
  },

  async updateItem(id: string, payload: Partial<InventoryItem>) {
    const res = await api.put<{ data: InventoryItem; message: string }>(`/inventory/items/${id}`, payload);
    return res.data;
  },

  async deleteItem(id: string) {
    const res = await api.delete<{ message: string }>(`/inventory/items/${id}`);
    return res.data;
  },

  async getBorrowings(params?: BorrowingFilter) {
    const res = await api.get<{ data: InventoryBorrowing[]; total: number }>('/inventory/borrowings', { params });
    return res.data;
  },

  async createBorrowing(payload: Partial<InventoryBorrowing>) {
    const res = await api.post<{ data: InventoryBorrowing; message: string }>('/inventory/borrowings', payload);
    return res.data;
  },

  async updateBorrowingStatus(id: string, payload: { status: string; condition_after?: string; admin_notes?: string }) {
    const res = await api.patch<{ message: string }>(`/inventory/borrowings/${id}/status`, payload);
    return res.data;
  },
};
