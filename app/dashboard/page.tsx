import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Welcome to Quotify AI</h1>
      <p className="mt-2 text-muted-foreground">
        Manage your leads and product catalog from the sidebar.
      </p>
      <div className="mt-6 flex gap-3">
        <Button render={<Link href="/dashboard/customers" />}>
          View customers
        </Button>
        <Button variant="outline" render={<Link href="/dashboard/products" />}>
          View products
        </Button>
      </div>
    </div>
  );
}
