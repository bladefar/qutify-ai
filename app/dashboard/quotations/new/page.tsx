import { NewQuotationClient } from "@/features/quotations";
import { getCustomers } from "@/services/customers";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage() {
  return <NewQuotationClient initialCustomers={await getCustomers()} />;
}
