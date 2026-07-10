"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  { label: "Products", href: "/dashboard/products", icon: Package },
  { label: "AI Assistant", href: "/dashboard/assistant", icon: Bot, disabled: true },
  { label: "Quotations", href: "/dashboard/quotations", icon: FileText, disabled: true },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, disabled: true },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, disabled: true },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border/50 bg-card">
      <div className="flex h-16 items-center border-b border-border/50 px-5">
        <Link href="/dashboard">
          <BrandLogo />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
              >
                <item.icon className="size-4" />
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/50 p-3">
        <SignOutButton />
      </div>
    </aside>
  );
}
