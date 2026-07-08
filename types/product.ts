export type Product = {
  id: string;
  user_id: string;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
  stock: number;
  created_at: string;
};

export type ProductInsert = {
  name: string;
  price: number;
  description?: string | null;
  category?: string | null;
  stock?: number;
};

export type ProductUpdate = Partial<ProductInsert>;
