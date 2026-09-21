import type { OrderStatus } from "@/lib/constants";

export type Product = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  is_active: boolean;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  company_id: string;
  product_id: string;
  name: string;
  units_per_package: number | null;
  price_cents: number;
  is_active: boolean;
  track_inventory: boolean;
  created_at: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  customer_id: string;
  order_number: number;
  status: OrderStatus;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  notes: string | null;
  delivered_at: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  product_name: string;
  variant_name: string;
  quantity: number;
  units_per_package: number | null;
  total_units: number | null;
  unit_price_cents: number;
  line_total_cents: number;
};

export type SaleVariant = ProductVariant & {
  productName: string;
  productImagePath: string | null;
};
