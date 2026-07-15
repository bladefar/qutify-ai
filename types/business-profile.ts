export type BusinessProfile = {
  id: string;
  user_id: string;
  business_name: string;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  gst_number: string | null;
  logo_url: string | null;
  default_gst_rate: number;
  created_at: string;
  updated_at: string;
};

export type BusinessProfileInput = {
  business_name: string;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  gst_number: string | null;
  default_gst_rate: number;
};
