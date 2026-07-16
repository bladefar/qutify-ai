import { ProductsPageClient } from "@/features/products";
import { getEffectiveEntitlements } from "@/services/entitlements";
import { getProductCount, getProductsPage } from "@/services/products";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const [productPage, productCount, entitlements] = await Promise.all([
    getProductsPage({
      page: Number(params.page ?? 1),
      search: params.search ?? "",
    }),
    getProductCount(),
    getEffectiveEntitlements(),
  ]);

  return (
    <ProductsPageClient
      {...productPage}
      search={params.search ?? ""}
      currentProductCount={productCount}
      productLimit={entitlements.limits.products}
      planName={entitlements.planName}
    />
  );
}
