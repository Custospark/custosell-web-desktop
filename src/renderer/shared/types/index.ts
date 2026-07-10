export interface User { id: number; business_id: number | null; role_id: number | null; name: string; email: string; phone: string | null; is_active: boolean; role?: Role; created_at: string; }
export interface Business { id: number; owner_id: number; name: string; slug: string; email: string | null; phone: string | null; address: string | null; currency: string; receipt_footer: string | null; logo_path: string | null; status: 'active' | 'suspended'; trial_ends_at: string | null; subscription?: Subscription; created_at: string; }
export interface Plan { id: number; name: string; slug: string; description: string | null; price_monthly: string; price_yearly: string | null; features: Record<string, boolean>; limits: Record<string, number | null>; is_active: boolean; sort_order: number; }
export interface Role { id: number; business_id: number | null; name: string; slug: string; description: string | null; permissions: Record<string, boolean>; is_default: boolean; }
export interface Category { id: number; business_id: number; name: string; description: string | null; sort_order: number; }
export interface Product { id: number; business_id: number; category_id: number | null; name: string; type?: 'product' | 'service'; description: string | null; sku: string | null; barcode: string | null; unit_price: string; cost_price: string | null; stock_quantity: number; low_stock_threshold: number; tax_percentage: string; is_active: boolean; category?: Category; }
export interface Customer { id: number; business_id: number; name: string; phone: string; email: string | null; total_purchases: string; last_purchase_at: string | null; }
export interface Shift { id: number; business_id: number; user_id: number; clock_in: string; clock_out: string | null; total_sales: string; total_cash: string; total_mobile_money: string; total_card: string; status: 'active' | 'completed'; notes: string | null; }
export interface Sale { id: number; business_id: number; user_id: number; customer_id: number | null; shift_id: number | null; receipt_number: string; subtotal: string; tax_total: string; discount_amount: string; total_amount: string; payment_method: 'cash' | 'mobile_money' | 'card' | 'other'; payment_status: 'paid' | 'partially_refunded' | 'refunded'; notes: string | null; sale_date: string; items?: SaleItem[]; }
export interface SaleItem { id: number; sale_id: number; product_id: number | null; product_name: string; product_price: string; quantity: number; unit_price: string; subtotal: string; tax_amount: string; discount_amount: string; refunded_quantity: number; refunded_amount: string; }
export interface StockMovement { id: number; business_id: number; product_id: number; sale_item_id: number | null; type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'initial'; quantity_change: number; stock_before: number; stock_after: number; reference: string | null; notes: string | null; created_by: number | null; }
export interface Subscription { id: number; business_id: number; plan_id: number; status: 'active' | 'trialing' | 'cancelled' | 'expired'; starts_at: string; trial_ends_at: string | null; ends_at: string | null; cancelled_at: string | null; plan?: Plan; }
export interface ExpenseCategory { id: number; business_id: number; name: string; description: string | null; sort_order: number; }
export interface Expense { id: number; business_id: number; expense_category_id: number | null; recorded_by: number | null; amount: string; description: string; reference: string | null; expense_date: string; category?: ExpenseCategory; }
export interface ApiResponse<T> { data: T; message?: string; }
export interface PaginatedResponse<T> { data: T[]; links: { first: string; last: string; prev: string | null; next: string | null; }; meta: { current_page: number; from: number; last_page: number; per_page: number; to: number; total: number; }; }
export interface LoginCredentials { email: string; password: string; }
export interface RegisterData { name: string; email: string; password: string; password_confirmation: string; phone?: string; }
export interface AuthResponse { user: ApiResponse<User>; token: string; }

declare const __APP_VERSION__: string;
export { __APP_VERSION__ }
