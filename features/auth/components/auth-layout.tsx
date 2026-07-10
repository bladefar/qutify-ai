"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";

type AuthLayoutProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12)_0%,_transparent_55%)]"
      />
      <div className="relative w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/">
            <BrandLogo />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="glass rounded-xl p-6">{children}</div>

        <p className="text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}
