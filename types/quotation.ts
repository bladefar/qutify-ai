export const QUOTATION_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "rejected",
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export type Quotation = {
  id: string;
  user_id: string;
  customer_id: string | null;
  subtotal: number;
  gst_amount: number;
  discount: number;
  total: number;
  gst_rate: number;
  status: QuotationStatus;
  raw_input: string;
  created_at: string;
};

export type QuotationItem = {
  id: string;
  quotation_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type QuotationListItem = Pick<
  Quotation,
  "id" | "customer_id" | "total" | "status" | "created_at"
> & {
  customer_name: string | null;
};

export type QuotationDetail = Quotation & {
  customer_name: string | null;
  items: QuotationItem[];
};
