export type PaymentMode = "cash" | "installment";
export type PaymentMethod = "pix" | "card" | "cash";
export type DeliveryType = "pickup" | "delivery";
export type SaleStatus = "paid" | "open" | "overdue";

export type OccurrenceType = "reclamacao" | "troca" | "reembolso";

export type SaleOccurrence = {
  type: OccurrenceType;
  obs: string;
  loss: number;
  products: string[];
  at: string;
};

export type Sale = {
  id: string;
  store_id: string;
  customer_id: string;
  sale_code: number;
  sold_at: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_mode: PaymentMode;
  payment_method: PaymentMethod | null;
  delivery_type: DeliveryType;
  notes: string | null;
  confirmation_status: "pending" | "confirmed";
  confirmed_at: string | null;
  occurrence_type: OccurrenceType | null;
  occurrence_obs: string | null;
  occurrence_loss: number;
  occurrence_products: string[];
  occurrence_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  created_at: string;
};

export type SaleInstallment = {
  id: string;
  sale_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid: boolean;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  created_at: string;
  updated_at: string;
};

export type SaleWithRelations = Sale & {
  customer?: {
    id: string;
    full_name: string;
    phone: string;
    avatar_color?: string;
  };
  items: SaleItem[];
  installments: SaleInstallment[];
};

export type CustomerBalance = {
  customer_id: string;
  owed_amount: number;
  overdue: boolean;
};

export type CreateSaleItemInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export type CreateSaleInstallmentInput = {
  installment_number: number;
  due_date: string;
  amount: number;
  paid?: boolean;
  paid_at?: string | null;
};
