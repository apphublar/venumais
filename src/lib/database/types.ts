export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
};

export type Store = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  brand_color: string;
  brand_text_color?: string | null;
  status: string;
  currency: string;
  timezone: string;
  pix_key?: string | null;
  pix_receiver_name?: string | null;
  catalog_tagline?: string | null;
};

export type UserStore = Store & {
  role: string;
};

export type Customer = {
  id: string;
  store_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  address_postal_code: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  birth_date: string | null;
  notes: string | null;
  avatar_color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  store_id: string;
  name: string;
  category: string;
  sku: string;
  description: string | null;
  cost: number;
  price: number;
  promo_price: number | null;
  wholesale_price: number | null;
  wholesale_min_qty: number | null;
  stock_qty: number;
  min_stock_qty: number;
  price_visible: boolean;
  sell_without_stock: boolean;
  stock_visible: boolean;
  featured: boolean;
  active: boolean;
  thumb_color: string;
  image_url: string | null;
  barcode: string | null;
  variations: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      stores: {
        Row: Store & { owner_user_id: string };
        Insert: {
          owner_user_id: string;
          name: string;
          slug: string;
        };
        Update: Partial<Store>;
      };
      store_members: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          role: string;
          status: string;
        };
      };
      customers: {
        Row: Customer;
        Insert: {
          store_id: string;
          full_name: string;
          phone: string;
          email?: string | null;
          address?: string | null;
          address_postal_code?: string | null;
          address_street?: string | null;
          address_number?: string | null;
          address_complement?: string | null;
          address_neighborhood?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          birth_date?: string | null;
          notes?: string | null;
          avatar_color?: string;
          created_by?: string | null;
        };
        Update: Partial<Omit<Customer, "id" | "store_id" | "created_at" | "updated_at">>;
      };
      products: {
        Row: Product;
        Insert: {
          store_id: string;
          name: string;
          category?: string;
          sku?: string;
          description?: string | null;
          cost?: number;
          price?: number;
          promo_price?: number | null;
          wholesale_price?: number | null;
          wholesale_min_qty?: number | null;
          stock_qty?: number;
          min_stock_qty?: number;
          price_visible?: boolean;
          featured?: boolean;
          active?: boolean;
          thumb_color?: string;
          image_url?: string | null;
          barcode?: string | null;
          variations?: string[];
          created_by?: string | null;
        };
        Update: Partial<Omit<Product, "id" | "store_id" | "created_at" | "updated_at">>;
      };
    };
  };
};
