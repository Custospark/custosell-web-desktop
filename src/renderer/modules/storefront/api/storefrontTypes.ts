export interface StorefrontShop {
  name: string;
  slug: string;
  description: string | null;
  logo_path: string | null;
  city: string | null;
  country: string | null;
  address?: string | null;
  state?: string | null;
  business_phone: string | null;
  business_email?: string | null;
  currency: string;
  rating_avg?: number;
  rating_count?: number;
  my_rating?: number | null;
}

export interface StorefrontProduct {
  id: number;
  name: string;
  description: string | null;
  unit_price: string | number;
  /** Regular price when on sale (same as unit_price). */
  compare_at_price?: string | number | null;
  /** Effective sell price when discount_percent &gt; 0. */
  sale_price?: string | number | null;
  discount_percent?: string | number | null;
  unit: string | null;
  image_path: string | null;
  type?: string;
  stock_quantity?: number;
  in_stock?: boolean;
  availability?: 'always' | 'in_stock' | 'out' | string;
  rating_avg?: number;
  rating_count?: number;
  my_rating?: number | null;
  category?: { id: number; name: string } | null;
  business?: {
    name: string;
    slug: string;
    logo_path: string | null;
    city: string | null;
    currency: string;
  } | null;
}

export interface StorefrontCategory {
  id: number;
  name: string;
  product_count: number;
}

export interface StorefrontCartItem {
  product: StorefrontProduct;
  quantity: number;
}

export interface PlaceStorefrontOrderPayload {
  customer_name: string;
  customer_phone: string;
  notes?: string;
  delivery_address?: string;
  delivery_city?: string;
  items: { product_id: number; quantity: number }[];
}

export interface PlaceStorefrontOrderResult {
  message: string;
  order_number: string;
  total_amount: string | number;
}

export interface MyStorefrontOrderItem {
  id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: string | number;
  subtotal: string | number;
}

export interface MyStorefrontOrder {
  id: number;
  order_number: string;
  status: 'open' | 'completed' | 'invoiced' | 'cancelled' | string;
  total_amount: string | number;
  items_count: number;
  items?: MyStorefrontOrderItem[];
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  delivery_city?: string | null;
  notes: string | null;
  created_at: string | null;
  shop_name: string | null;
  shop_slug: string | null;
  currency: string;
  sale_id?: number | null;
  receipt_number?: string | null;
  payment_status?: string | null;
  invoice_id?: number | null;
  invoice_number?: string | null;
}
