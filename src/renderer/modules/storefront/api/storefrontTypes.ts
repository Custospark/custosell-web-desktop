export interface StorefrontShop {
  name: string;
  slug: string;
  description: string | null;
  logo_path: string | null;
  city: string | null;
  country: string | null;
  business_phone: string | null;
  currency: string;
}

export interface StorefrontProduct {
  id: number;
  name: string;
  description: string | null;
  unit_price: string | number;
  unit: string | null;
  image_path: string | null;
  type?: string;
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
  items: { product_id: number; quantity: number }[];
}

export interface PlaceStorefrontOrderResult {
  message: string;
  order_number: string;
  total_amount: string | number;
}

export interface MyStorefrontOrder {
  id: number;
  order_number: string;
  status: 'open' | 'completed' | 'invoiced' | 'cancelled' | string;
  total_amount: string | number;
  items_count: number;
  notes: string | null;
  created_at: string | null;
  shop_name: string | null;
  shop_slug: string | null;
  currency: string;
}
