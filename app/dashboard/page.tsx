import Link from "next/link";
import {
  FileText,
  IndianRupee,
  Package,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerStatusBadge } from "@/features/customers/components/customer-status-badge";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { getCustomerCount, getRecentCustomers } from "@/services/customers";
import { getProductCount } from "@/services/products";
import { getQuoteDashboardStats } from "@/services/quotations";

export const dynamic = "force-dynamic";

const statCards = [
  {
    label: "Total Customers",
    key: "customers" as const,
    icon: Users,
    iconClass: "bg-primary/10 text-primary",
  },
  {
    label: "Total Products",
    key: "products" as const,
    icon: Package,
    iconClass: "bg-brand-accent/10 text-brand-accent",
  },
  {
    label: "Quotes This Month",
    key: "quotes" as const,
    icon: FileText,
    iconClass: "bg-brand-success/10 text-brand-success",
  },
  {
    label: "Pipeline Value",
    key: "pipeline" as const,
    icon: IndianRupee,
    iconClass: "bg-destructive/10 text-destructive",
  },
];

const quickActions = [
  {
    label: "Add Customer",
    description: "Create a new lead",
    href: "/dashboard/customers",
    icon: UserPlus,
  },
  {
    label: "Add Product",
    description: "Expand your catalog",
    href: "/dashboard/products",
    icon: Package,
  },
  {
    label: "New Quote",
    description: "Generate a quotation",
    href: "/dashboard/quotations/new",
    icon: FileText,
  },
];

function formatPipelineValue(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default async function DashboardPage() {
  const [customerCount, productCount, recentCustomers, quoteStats] = await Promise.all([
    getCustomerCount(),
    getProductCount(),
    getRecentCustomers(5),
    getQuoteDashboardStats(),
  ]);

  const stats = {
    customers: customerCount,
    products: productCount,
    quotes: quoteStats.quoteCount,
    pipeline: quoteStats.pipelineValue,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your leads, catalog, and pipeline.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.key} className="glass py-4">
            <CardContent className="flex items-center gap-4 px-4">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${stat.iconClass}`}
              >
                <stat.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums tracking-tight">
                  {stat.key === "pipeline"
                    ? formatPipelineValue(stats[stat.key])
                    : stats[stat.key]}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="glass py-0 lg:col-span-3">
          <CardContent className="px-4 py-4">
            <h2 className="mb-4 font-semibold">Recent activity</h2>

            {recentCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-muted-foreground">No customers yet</p>
                <Button nativeButton={false} className="mt-4" render={<Link href="/dashboard/customers" />}>
                  <Plus className="size-4" />
                  Add your first customer
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {recentCustomers.map((customer) => (
                  <li
                    key={customer.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{customer.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {customer.company ?? "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <CustomerStatusBadge status={customer.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(customer.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3 lg:col-span-2">
          <h2 className="font-semibold">Quick actions</h2>
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="glass py-4 transition-colors hover:border-primary/30">
                <CardContent className="flex items-center gap-4 px-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <action.icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium">{action.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
