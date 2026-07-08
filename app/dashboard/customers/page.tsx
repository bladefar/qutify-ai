import { CustomersPageClient } from "@/features/customers";
import { getCustomers } from "@/services/customers";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return <CustomersPageClient customers={customers} />;
}
