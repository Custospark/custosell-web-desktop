export interface ExpenseCategory {
  id: number;
  business_id: number;
  name: string;
  description: string | null;
  sort_order: number;
  budget_amount: string | null;
  budget_period: string | null;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategoryWithSyncMeta = ExpenseCategory & {
  _pendingSync?: boolean;
  _localId?: string;
};

export interface UserInfo {
  id: number;
  name: string;
  email: string;
}

export interface Expense {
  id: number;
  business_id: number;
  expense_category_id: number | null;
  expense_category?: ExpenseCategory | null;
  recorded_by: number | null;
  recorded_by_user?: { data: UserInfo } | null;
  amount: string;
  description: string;
  reference: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurrence_interval: string | null;
  recurrence_end_date: string | null;
  next_due_date: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export type ExpenseWithSyncMeta = Expense & {
  _pendingSync?: boolean;
  _localId?: string;
  _pendingReceipt?: boolean;
};

export interface ExpenseReceiptPayload {
  blob: Blob;
  name: string;
  type: string;
  size: number;
  lastModified?: number;
}

export interface ExpenseFormPayload {
  fields: Record<string, string>;
  receipt?: ExpenseReceiptPayload;
}

export interface CreateExpenseData {
  expense_category_id?: number | null;
  amount: number;
  description: string;
  reference?: string | null;
  receipt?: File | null;
  is_recurring?: boolean;
  recurrence_interval?: string | null;
  recurrence_end_date?: string | null;
  next_due_date?: string | null;
  expense_date: string;
}

export type UpdateExpenseData = Partial<CreateExpenseData>;

export interface CreateExpenseCategoryData {
  name: string;
  description?: string | null;
  sort_order?: number;
  budget_amount?: number | null;
  budget_period?: string | null;
}

export interface ExpenseSummary {
  total_amount: number;
  total_count: number;
  by_category: {
    category_id: number | null;
    category_name: string;
    total: number;
    count: number;
  }[];
}
