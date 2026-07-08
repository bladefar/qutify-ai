export const CUSTOMER_STATUSES = ["hot", "warm", "cold", "closed"] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export type Customer = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
  status: CustomerStatus;
  last_contact: string | null;
  created_at: string;
};

export type CustomerInsert = {
  name: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  notes?: string | null;
  status?: CustomerStatus;
  last_contact?: string | null;
};

export type CustomerUpdate = Partial<CustomerInsert>;

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  closed: "Closed",
};
