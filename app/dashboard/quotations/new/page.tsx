import { NewQuotationClient } from "@/features/quotations";
import { getBusinessProfile } from "@/services/business-profiles";
import { getCustomers } from "@/services/customers";
import { getEffectiveEntitlements } from "@/services/entitlements";
import { getCurrentUsage } from "@/services/usage";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage() {
  const [customers, businessProfile, entitlements, usage] = await Promise.all([
    getCustomers(),
    getBusinessProfile(),
    getEffectiveEntitlements(),
    getCurrentUsage(),
  ]);

  return (
    <NewQuotationClient
      initialCustomers={customers}
      defaultGstRate={businessProfile?.default_gst_rate ?? 18}
      quotationUsage={usage.quotationsThisMonth}
      quotationLimit={entitlements.limits.quotationsPerMonth}
      planName={entitlements.planName}
    />
  );
}
