import { ProductsPageClient } from "@/features/products";
import { getProductsPage } from "@/services/products";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const productPage = await getProductsPage({
    page: Number(params.page ?? 1),
    search: params.search ?? "",
  });

  return <ProductsPageClient {...productPage} search={params.search ?? ""} />;
}
