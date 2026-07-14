import { QuotationsList } from "@/features/quotations";
import { getQuotations } from "@/services/quotations";

export const dynamic = "force-dynamic";

export default async function QuotationsPage() {
  return <QuotationsList quotations={await getQuotations()} />;
}
