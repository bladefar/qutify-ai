import { ProductsPageClient } from "@/features/products";
import { getProducts } from "@/services/products";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts();

  return <ProductsPageClient products={products} />;
}
