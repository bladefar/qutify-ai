import { CustomersPageClient } from "@/features/customers";
import { getCustomersPage } from "@/services/customers";
import { CUSTOMER_STATUSES, type CustomerStatus } from "@/types/customer";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const status = CUSTOMER_STATUSES.includes(params.status as CustomerStatus)
    ? (params.status as CustomerStatus)
    : "all";
  const customerPage = await getCustomersPage({
    page: Number(params.page ?? 1),
    search: params.search ?? "",
    status,
  });

  return (
    <CustomersPageClient
      {...customerPage}
      search={params.search ?? ""}
      status={status}
    />
  );
}
