import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TopProductPoint } from "@/services/analytics";

export function TopProductsTable({
  data,
  hasQuotes,
}: {
  data: TopProductPoint[];
  hasQuotes: boolean;
}) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Top products</CardTitle>
        <CardDescription>Ranked by total units quoted, top 10.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasQuotes ? (
          <div className="flex items-center justify-center py-12 text-center">
            <div>
              <p className="font-medium">No quotations yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a quotation to see which products are requested most.
              </p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-center">
            <div>
              <p className="font-medium">No quoted products yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Matched products will appear here once a quotation is saved.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Product</th>
                  <th className="pb-3 text-right font-medium">Units quoted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.map((product, index) => (
                  <tr key={product.productName}>
                    <td className="py-3 pr-4">
                      <span className="mr-3 inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      {product.productName}
                    </td>
                    <td className="py-3 text-right font-semibold tabular-nums">
                      {product.quantity.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
