export type StoreCoupon = {
  id: string;
  store_id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  description: string | null;
  uses_count: number;
  active: boolean;
  created_at: string;
};
