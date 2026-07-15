import { NewQuotationClient } from "@/features/quotations";
import { getBusinessProfile } from "@/services/business-profiles";
import { getCustomers } from "@/services/customers";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage() {
  const [customers, businessProfile] = await Promise.all([
    getCustomers(),
    getBusinessProfile(),
  ]);

  return (
    <NewQuotationClient
      initialCustomers={customers}
      defaultGstRate={businessProfile?.default_gst_rate ?? 18}
    />
  );
}
